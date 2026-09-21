"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnvironment = validateEnvironment;
const nodeEnvironments = new Set([
    'development',
    'test',
    'production',
]);
function validateEnvironment(values) {
    const nodeEnvironmentValue = values.NODE_ENV ?? 'development';
    if (typeof nodeEnvironmentValue !== 'string') {
        throw new Error('NODE_ENV must be development, test, or production');
    }
    const nodeEnvironment = nodeEnvironmentValue;
    if (!nodeEnvironments.has(nodeEnvironment)) {
        throw new Error('NODE_ENV must be development, test, or production');
    }
    const port = Number(values.PORT ?? 3001);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('PORT must be an integer between 1 and 65535');
    }
    const databaseUrlValue = values.DATABASE_URL ?? '';
    if (typeof databaseUrlValue !== 'string') {
        throw new Error('DATABASE_URL is required');
    }
    const databaseUrl = databaseUrlValue.trim();
    if (!databaseUrl) {
        throw new Error('DATABASE_URL is required');
    }
    let parsedDatabaseUrl;
    try {
        parsedDatabaseUrl = new URL(databaseUrl);
    }
    catch {
        throw new Error('DATABASE_URL must be a valid PostgreSQL URL');
    }
    if (!['postgres:', 'postgresql:'].includes(parsedDatabaseUrl.protocol)) {
        throw new Error('DATABASE_URL must use the postgres protocol');
    }
    if (!parsedDatabaseUrl.hostname || parsedDatabaseUrl.pathname === '/') {
        throw new Error('DATABASE_URL must include a host and database name');
    }
    return {
        ...values,
        NODE_ENV: nodeEnvironment,
        PORT: port,
        DATABASE_URL: databaseUrl,
    };
}
//# sourceMappingURL=environment.js.map