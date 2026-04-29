"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const auth_module_1 = require("./modules/core/auth/auth.module");
const mail_module_1 = require("./common/mail/mail.module");
const profile_module_1 = require("./modules/core/profile/profile.module");
const chat_module_1 = require("./modules/core/chat/chat.module");
const notifications_module_1 = require("./modules/core/notifications/notifications.module");
const moderation_module_1 = require("./modules/core/moderation/moderation.module");
const payment_module_1 = require("./modules/core/payment/payment.module");
const admin_module_1 = require("./modules/core/admin/admin.module");
const app_config_1 = __importDefault(require("./config/app.config"));
const database_config_1 = __importDefault(require("./config/database.config"));
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [app_config_1.default, database_config_1.default],
                envFilePath: '.env',
            }),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    type: 'postgres',
                    host: configService.get('database.host'),
                    port: configService.get('database.port'),
                    database: configService.get('database.name'),
                    username: configService.get('database.user'),
                    password: configService.get('database.password'),
                    entities: [__dirname + '/**/*.entity{.ts,.js}'],
                    synchronize: false,
                    logging: configService.get('app.nodeEnv') === 'development',
                }),
                inject: [config_1.ConfigService],
            }),
            auth_module_1.AuthModule,
            mail_module_1.MailModule,
            profile_module_1.ProfileModule,
            chat_module_1.ChatModule,
            notifications_module_1.NotificationsModule,
            moderation_module_1.ModerationModule,
            payment_module_1.PaymentModule,
            admin_module_1.AdminModule,
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map