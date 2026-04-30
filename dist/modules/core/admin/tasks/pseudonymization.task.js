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
var PseudonymizationTask_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PseudonymizationTask = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("typeorm");
let PseudonymizationTask = PseudonymizationTask_1 = class PseudonymizationTask {
    dataSource;
    logger = new common_1.Logger(PseudonymizationTask_1.name);
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async run() {
        const rows = await this.dataSource.query('SELECT id FROM users_pending_pseudonymization');
        let count = 0;
        for (const { id } of rows) {
            try {
                await this.dataSource.query('SELECT pseudonymize_user($1)', [id]);
                count++;
            }
            catch (err) {
                this.logger.error(`Pseudonymization failed for user ${id}`, err);
            }
        }
        this.logger.log(`Pseudonymized ${count} user(s)`);
    }
};
exports.PseudonymizationTask = PseudonymizationTask;
__decorate([
    (0, schedule_1.Cron)('0 2 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PseudonymizationTask.prototype, "run", null);
exports.PseudonymizationTask = PseudonymizationTask = PseudonymizationTask_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], PseudonymizationTask);
//# sourceMappingURL=pseudonymization.task.js.map