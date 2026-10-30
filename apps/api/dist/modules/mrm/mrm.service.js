"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MrmService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const mrm_calculation_service_1 = require("./mrm-calculation.service");
const mrm_repository_1 = require("./mrm.repository");
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const keyPattern = /^[a-z0-9][a-z0-9-]{0,99}$/;
const allowedMimeTypes = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
]);
function shiftMonth(month, offset) {
    const [year, monthNumber] = month.split('-').map(Number);
    const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
function currentMonth() {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(month) {
    const [year, monthNumber] = month.split('-').map(Number);
    return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthNumber - 1]}'${String(year).slice(-2)}`;
}
let MrmService = class MrmService {
    repository;
    calculations;
    constructor(repository, calculations) {
        this.repository = repository;
        this.calculations = calculations;
    }
    async listMonths() {
        const generatedMonth = currentMonth();
        const [reports, availableDataMonths] = await Promise.all([
            this.repository.listReports(),
            this.repository.listAvailableDataMonths(),
        ]);
        const monthsByReportingMonth = new Map(reports.map((report) => [report.reportingMonth, report]));
        monthsByReportingMonth.set(generatedMonth, monthsByReportingMonth.get(generatedMonth) ?? {
            reportingMonth: generatedMonth,
            dataMonth: shiftMonth(generatedMonth, -1),
            status: 'draft',
        });
        for (const dataMonth of availableDataMonths) {
            const reportingMonth = shiftMonth(dataMonth, 1);
            if (reportingMonth > generatedMonth || monthsByReportingMonth.has(reportingMonth))
                continue;
            monthsByReportingMonth.set(reportingMonth, {
                reportingMonth,
                dataMonth,
                status: 'draft',
            });
        }
        const months = [...monthsByReportingMonth.values()].sort((left, right) => (right.reportingMonth.localeCompare(left.reportingMonth)));
        const statuses = await Promise.all(months.map(async (month) => ({
            ...month,
            sourceStatus: await this.calculations.getSourceStatus(month.dataMonth),
        })));
        return { currentMonth: generatedMonth, months: statuses };
    }
    async getReport(reportingMonth, user) {
        this.assertMonth(reportingMonth);
        const report = await this.repository.getReport(reportingMonth);
        if (report?.status === 'finalized') {
            const snapshot = await this.repository.getSnapshot(report.id);
            if (!this.isDocument(snapshot))
                throw new Error('MRM_SNAPSHOT_INVALID');
            const buckets = await this.repository.getScopedBuckets(report.id, user.accountId);
            return this.applyCalculatedValues({
                ...snapshot,
                canManage: false,
                updatedAt: report.updated_at,
                finalizedAt: report.finalized_at,
            }, buckets);
        }
        const dataMonth = shiftMonth(reportingMonth, -1);
        const [rows, columns, cells, attachments, calculations] = await Promise.all([
            this.repository.getRows(reportingMonth, report?.id ?? null),
            this.repository.getColumns(reportingMonth, report?.id ?? null),
            this.repository.getCells(report?.id ?? null),
            this.repository.getAttachments(report?.id ?? null),
            this.calculateRollingMonths(reportingMonth, user.accountId),
        ]);
        const latestCalculation = calculations.find((calculation) => (calculation.buckets.some((bucket) => bucket.dataMonth === dataMonth))) ?? calculations[calculations.length - 1];
        const cellMap = new Map(cells.map((cell) => [`${cell.row_key}\0${cell.column_key}`, cell.value]));
        const document = {
            schemaVersion: 1,
            reportingMonth,
            dataMonth,
            status: 'draft',
            revision: Number(report?.revision ?? 0),
            canManage: user.roles.includes('hrbp'),
            sourceStatus: latestCalculation?.sourceStatus ?? { available: false, source: null },
            columns: columns.map((column) => this.mapColumn(column, reportingMonth)),
            rows: rows.map((row) => this.mapRow(row, columns, cellMap)),
            attachments,
            updatedAt: report?.updated_at ?? null,
            finalizedAt: null,
        };
        return this.applyCalculatedValues(document, calculations.flatMap((calculation) => calculation.buckets));
    }
    async saveReport(reportingMonth, user, body) {
        this.assertMonth(reportingMonth);
        const input = this.parseSaveInput(body);
        await this.repository.saveDraft(reportingMonth, user.accountId, input);
        return this.getReport(reportingMonth, user);
    }
    async finalize(reportingMonth, user, expectedRevision) {
        this.assertMonth(reportingMonth);
        if (!Number.isInteger(expectedRevision) || Number(expectedRevision) < 0) {
            throw new common_1.BadRequestException('Expected revision is invalid.');
        }
        let document = await this.getReport(reportingMonth, user);
        if (document.status === 'finalized')
            return document;
        if (!document.sourceStatus.available) {
            throw new common_1.BadRequestException('The MRM source month is unavailable.');
        }
        if (document.revision === 0) {
            const input = this.documentToSave(document, 0);
            await this.repository.saveDraft(reportingMonth, user.accountId, input);
            document = await this.getReport(reportingMonth, user);
        }
        else if (document.revision !== Number(expectedRevision)) {
            throw new common_1.ConflictException('Expected revision does not match the loaded report.');
        }
        const report = await this.repository.getReport(reportingMonth);
        if (!report)
            throw new common_1.NotFoundException('MRM report not found.');
        const calculations = await this.calculateRollingMonths(reportingMonth, user.accountId);
        const latestCalculation = calculations[calculations.length - 1];
        if (!latestCalculation?.sourceStatus.available) {
            throw new common_1.BadRequestException('The MRM source month is unavailable.');
        }
        await this.repository.finalize(report.id, user.accountId, document.revision, calculations.flatMap((calculation) => calculation.buckets), document);
        return this.getReport(reportingMonth, user);
    }
    async uploadAttachment(reportingMonth, user, rowKey, columnKey, file) {
        this.assertMonth(reportingMonth);
        if (!file || !Buffer.isBuffer(file.buffer))
            throw new common_1.BadRequestException('Attachment file is required.');
        if (typeof rowKey !== 'string' || !keyPattern.test(rowKey)
            || typeof columnKey !== 'string' || !keyPattern.test(columnKey)) {
            throw new common_1.BadRequestException('Attachment target is invalid.');
        }
        if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
            throw new common_1.BadRequestException('Attachment must be between 1 byte and 10 MB.');
        }
        if (!allowedMimeTypes.has(file.mimetype)) {
            throw new common_1.BadRequestException('Attachment type is not supported.');
        }
        const report = await this.repository.getReport(reportingMonth);
        if (!report)
            throw new common_1.NotFoundException('Save the MRM draft before attaching files.');
        const safeFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'attachment';
        const sha256 = (0, node_crypto_1.createHash)('sha256').update(file.buffer).digest('hex');
        await this.repository.addAttachment(report.id, rowKey, columnKey, user.accountId, file, safeFilename, sha256);
        return this.getReport(reportingMonth, user);
    }
    async downloadAttachment(reportingMonth, attachmentId, user) {
        this.assertMonth(reportingMonth);
        const report = await this.repository.getReport(reportingMonth);
        if (!report)
            throw new common_1.NotFoundException('MRM report not found.');
        const attachment = await this.repository.getAttachment(report.id, attachmentId, user.accountId);
        if (!attachment)
            throw new common_1.NotFoundException('Attachment not found.');
        return attachment;
    }
    async deleteAttachment(reportingMonth, attachmentId, user) {
        this.assertMonth(reportingMonth);
        const report = await this.repository.getReport(reportingMonth);
        if (!report)
            throw new common_1.NotFoundException('MRM report not found.');
        await this.repository.deleteAttachment(report.id, attachmentId, user.accountId);
    }
    mapColumn(column, reportingMonth) {
        const rollingMonth = column.rolling_month_offset === null
            ? null
            : shiftMonth(reportingMonth, column.rolling_month_offset);
        const label = rollingMonth
            ? monthLabel(rollingMonth)
            : column.column_key === 'status'
                ? `YTD'${reportingMonth.slice(2, 4)} against TBP.${reportingMonth.slice(2, 4)}`
                : column.label.replace('\\n', '\n');
        return {
            id: column.column_key,
            key: column.column_key,
            label,
            type: column.column_type,
            managed: column.managed,
        };
    }
    mapRow(row, columns, cells) {
        return {
            key: row.row_key,
            title: row.title,
            description: row.description,
            mode: row.value_mode,
            highlighted: row.highlighted,
            muted: row.muted,
            emphasized: row.emphasized,
            managed: row.managed,
            cells: Object.fromEntries(columns.flatMap((column) => {
                const value = cells.get(`${row.row_key}\0${column.column_key}`);
                return value === undefined ? [] : [[column.column_key, value]];
            })),
        };
    }
    applyCalculatedValues(document, buckets) {
        const rollingMonths = new Map([
            ['rolling-previous', shiftMonth(document.reportingMonth, -2)],
            ['rolling-latest', shiftMonth(document.reportingMonth, -1)],
        ]);
        const totals = new Map();
        for (const bucket of buckets) {
            const key = `${bucket.dataMonth}\0${bucket.metricKey}`;
            const total = totals.get(key);
            if (!total) {
                totals.set(key, { ...bucket });
                continue;
            }
            total.numerator += bucket.numerator;
            if (bucket.denominator !== null) {
                total.denominator = (total.denominator ?? 0) + bucket.denominator;
            }
            total.qualityCount += bucket.qualityCount;
        }
        return {
            ...document,
            rows: document.rows.map((row) => {
                if (row.mode !== 'calculated')
                    return row;
                const cells = { ...row.cells };
                for (const [columnKey, dataMonth] of rollingMonths) {
                    if (!document.columns.some((column) => column.key === columnKey))
                        continue;
                    const metric = totals.get(`${dataMonth}\0${row.key}`);
                    cells[columnKey] = !metric
                        ? null
                        : metric.denominator === null
                            ? String(metric.numerator)
                            : `${metric.numerator} (${metric.denominator > 0 ? ((metric.numerator / metric.denominator) * 100).toFixed(1) : '0.0'}%)`;
                }
                return { ...row, cells };
            }),
        };
    }
    calculateRollingMonths(reportingMonth, accountId) {
        return Promise.all([
            this.calculations.calculate(shiftMonth(reportingMonth, -2), accountId),
            this.calculations.calculate(shiftMonth(reportingMonth, -1), accountId),
        ]);
    }
    parseSaveInput(body) {
        if (!body || typeof body !== 'object')
            throw new common_1.BadRequestException('MRM save payload is required.');
        const value = body;
        if (!Number.isInteger(value.expectedRevision) || Number(value.expectedRevision) < 0) {
            throw new common_1.BadRequestException('Expected revision is invalid.');
        }
        if (!Array.isArray(value.columns) || value.columns.length < 1 || value.columns.length > 50
            || !Array.isArray(value.rows) || value.rows.length < 1 || value.rows.length > 100) {
            throw new common_1.BadRequestException('MRM rows or columns are invalid.');
        }
        const columns = value.columns.map((entry) => {
            if (!entry || typeof entry !== 'object')
                throw new common_1.BadRequestException('MRM column is invalid.');
            const column = entry;
            if (typeof column.key !== 'string' || !keyPattern.test(column.key)
                || typeof column.label !== 'string' || !column.label.trim() || column.label.length > 200
                || !['value', 'status', 'attachment'].includes(String(column.type))
                || typeof column.managed !== 'boolean') {
                throw new common_1.BadRequestException('MRM column is invalid.');
            }
            return { key: column.key, label: column.label, type: column.type, managed: column.managed };
        });
        const rows = value.rows.map((entry) => {
            if (!entry || typeof entry !== 'object')
                throw new common_1.BadRequestException('MRM row is invalid.');
            const row = entry;
            if (typeof row.key !== 'string' || !keyPattern.test(row.key)
                || typeof row.title !== 'string' || !row.title.trim() || row.title.length > 300
                || typeof row.description !== 'string' || row.description.length > 500
                || typeof row.highlighted !== 'boolean' || typeof row.muted !== 'boolean'
                || typeof row.emphasized !== 'boolean' || typeof row.managed !== 'boolean'
                || !row.cells || typeof row.cells !== 'object' || Array.isArray(row.cells)) {
                throw new common_1.BadRequestException('MRM row is invalid.');
            }
            return {
                key: row.key, title: row.title, description: row.description,
                highlighted: row.highlighted, muted: row.muted,
                emphasized: row.emphasized, managed: row.managed,
                cells: row.cells,
            };
        });
        if (new Set(columns.map((column) => column.key)).size !== columns.length
            || new Set(rows.map((row) => row.key)).size !== rows.length) {
            throw new common_1.BadRequestException('MRM row and column keys must be unique.');
        }
        return { expectedRevision: Number(value.expectedRevision), columns, rows };
    }
    documentToSave(document, expectedRevision) {
        return {
            expectedRevision,
            columns: document.columns.map((column) => ({
                key: column.key, label: column.label, type: column.type, managed: column.managed,
            })),
            rows: document.rows.map((row) => ({
                key: row.key, title: row.title, description: row.description,
                highlighted: row.highlighted, muted: row.muted,
                emphasized: row.emphasized, managed: row.managed,
                cells: row.mode === 'manual' ? row.cells : {},
            })),
        };
    }
    assertMonth(month) {
        if (!monthPattern.test(month))
            throw new common_1.BadRequestException('Reporting month must use YYYY-MM.');
    }
    isDocument(value) {
        if (!value || typeof value !== 'object')
            return false;
        const document = value;
        return document.schemaVersion === 1 && Array.isArray(document.columns) && Array.isArray(document.rows);
    }
};
exports.MrmService = MrmService;
exports.MrmService = MrmService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mrm_repository_1.MrmRepository,
        mrm_calculation_service_1.MrmCalculationService])
], MrmService);
//# sourceMappingURL=mrm.service.js.map