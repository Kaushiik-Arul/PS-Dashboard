"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const argon2_1 = __importDefault(require("argon2"));
const pg_1 = require("pg");
function getArgument(name) {
    const index = process.argv.indexOf(`--${name}`);
    return index === -1 ? undefined : process.argv[index + 1];
}
function parseArguments() {
    const role = getArgument('role');
    const email = getArgument('email')?.trim().toLowerCase();
    const displayName = getArgument('name')?.trim();
    const persNoValue = getArgument('pers-no')?.trim();
    if (role !== 'hrbp' && role !== 'admin') {
        throw new Error('--role must be hrbp or admin');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('--email must be a valid email address');
    }
    if (!displayName) {
        throw new Error('--name is required');
    }
    if (persNoValue && !/^\d+$/.test(persNoValue)) {
        throw new Error('--pers-no must contain digits only');
    }
    return {
        role,
        email,
        displayName,
        persNo: persNoValue || null,
    };
}
function readSecret(prompt) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
        throw new Error('Password entry requires an interactive terminal');
    }
    return new Promise((resolve, reject) => {
        let value = '';
        const input = process.stdin;
        const cleanup = () => {
            input.off('data', onData);
            input.setRawMode(false);
            input.pause();
        };
        const onData = (chunk) => {
            for (const byte of chunk) {
                if (byte === 3) {
                    cleanup();
                    process.stdout.write('\n');
                    reject(new Error('Cancelled'));
                    return;
                }
                if (byte === 13 || byte === 10) {
                    cleanup();
                    process.stdout.write('\n');
                    resolve(value);
                    return;
                }
                if (byte === 8 || byte === 127) {
                    if (value.length > 0) {
                        value = value.slice(0, -1);
                        process.stdout.write('\b \b');
                    }
                    continue;
                }
                if (byte >= 32 && byte <= 126) {
                    value += String.fromCharCode(byte);
                    process.stdout.write('*');
                }
            }
        };
        process.stdout.write(prompt);
        input.setRawMode(true);
        input.resume();
        input.on('data', onData);
    });
}
async function validateEmployeeLink(client, persNo, loginEmail) {
    if (persNo === null)
        return;
    const result = await client.query(`SELECT official_email
     FROM public.employee_namelist
     WHERE pers_no = $1`, [persNo]);
    const employee = result.rows[0];
    if (!employee) {
        throw new Error(`No employee_namelist row exists for pers_no ${persNo}`);
    }
    const officialEmail = employee.official_email?.trim().toLowerCase();
    if (officialEmail && officialEmail !== loginEmail) {
        throw new Error(`Login email must match employee_namelist official_email (${officialEmail})`);
    }
}
async function createInitialAccount(client, input, passwordHash) {
    await client.query('BEGIN');
    try {
        await validateEmployeeLink(client, input.persNo, input.email);
        const accountResult = await client.query(`INSERT INTO public.auth_accounts (
         pers_no,
         display_name,
         login_email,
         password_hash,
         must_change_password,
         account_status
       ) VALUES ($1, $2, $3, $4, TRUE, 'active')
       RETURNING account_id`, [input.persNo, input.displayName, input.email, passwordHash]);
        const accountId = accountResult.rows[0]?.account_id;
        if (!accountId)
            throw new Error('Account creation returned no account ID');
        await client.query(`INSERT INTO public.master_access (account_id, role)
       VALUES ($1, $2)`, [accountId, input.role]);
        await client.query(`INSERT INTO public.security_audit_log (
         event_type,
         target_account_id,
         event_details
       ) VALUES (
         'account_created',
         $1,
         JSONB_BUILD_OBJECT('role', $2::TEXT, 'bootstrap', TRUE)
       )`, [accountId, input.role]);
        await client.query('COMMIT');
        return accountId;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
}
async function main() {
    const input = parseArguments();
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) {
        throw new Error('DATABASE_URL is required');
    }
    const password = await readSecret('Temporary password: ');
    const confirmation = await readSecret('Confirm temporary password: ');
    if (password.length < 12) {
        throw new Error('Temporary password must contain at least 12 characters');
    }
    if (password !== confirmation) {
        throw new Error('Temporary passwords do not match');
    }
    const passwordHash = await argon2_1.default.hash(password, {
        type: argon2_1.default.argon2id,
        memoryCost: 19_456,
        timeCost: 2,
        parallelism: 1,
    });
    const pool = new pg_1.Pool({
        connectionString: databaseUrl,
        max: 1,
        application_name: 'ps-dashboard-access-seed',
    });
    try {
        const client = await pool.connect();
        try {
            const accountId = await createInitialAccount(client, input, passwordHash);
            console.log(`Created ${input.role} account ${accountId} for ${input.email}`);
        }
        finally {
            client.release();
        }
    }
    finally {
        await pool.end();
    }
}
main().catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Unable to create initial account: ${message}`);
    process.exitCode = 1;
});
//# sourceMappingURL=seed-initial-access.js.map