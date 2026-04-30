"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModerationModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const moderation_controller_1 = require("./moderation.controller");
const moderation_service_1 = require("./moderation.service");
const jwt_guard_1 = require("../../../common/guards/jwt.guard");
const roles_guard_1 = require("../../../common/guards/roles.guard");
const report_entity_1 = require("./entities/report.entity");
const strike_entity_1 = require("./entities/strike.entity");
const user_entity_1 = require("../auth/entities/user.entity");
let ModerationModule = class ModerationModule {
};
exports.ModerationModule = ModerationModule;
exports.ModerationModule = ModerationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([report_entity_1.Report, strike_entity_1.Strike, user_entity_1.User]),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    secret: configService.get('JWT_SECRET'),
                    signOptions: { expiresIn: '15m' },
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [moderation_controller_1.ModerationController],
        providers: [moderation_service_1.ModerationService, jwt_guard_1.JwtGuard, roles_guard_1.RolesGuard],
    })
], ModerationModule);
//# sourceMappingURL=moderation.module.js.map