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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const subscription_entity_1 = require("./entities/subscription.entity");
const payment_log_entity_1 = require("./entities/payment-log.entity");
let PaymentService = class PaymentService {
    subscriptionRepository;
    paymentLogRepository;
    constructor(subscriptionRepository, paymentLogRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.paymentLogRepository = paymentLogRepository;
    }
    async getActiveSubscription(userId) {
        return this.subscriptionRepository.findOne({
            where: { user_id: userId, status: 'active' },
        });
    }
    async createSubscription(userId, dto) {
        const subscription = this.subscriptionRepository.create({
            user_id: userId,
            plan: dto.plan,
            status: 'active',
            payment_provider: dto.payment_provider,
            provider_subscription_id: dto.provider_subscription_id ?? null,
            started_at: new Date(),
        });
        return this.subscriptionRepository.save(subscription);
    }
    async cancelSubscription(userId, subscriptionId) {
        const subscription = await this.subscriptionRepository.findOne({
            where: { id: subscriptionId },
        });
        if (!subscription)
            throw new common_1.NotFoundException('Abonnement nicht gefunden');
        if (subscription.user_id !== userId)
            throw new common_1.ForbiddenException('Keine Berechtigung');
        subscription.status = 'cancelled';
        subscription.cancelled_at = new Date();
        return this.subscriptionRepository.save(subscription);
    }
    async getPaymentLogs(userId) {
        return this.paymentLogRepository.find({
            where: { user_id: userId },
            order: { created_at: 'DESC' },
        });
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(subscription_entity_1.Subscription)),
    __param(1, (0, typeorm_1.InjectRepository)(payment_log_entity_1.PaymentLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], PaymentService);
//# sourceMappingURL=payment.service.js.map