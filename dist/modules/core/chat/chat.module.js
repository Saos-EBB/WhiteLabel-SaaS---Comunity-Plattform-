"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const chat_controller_1 = require("./chat.controller");
const chat_service_1 = require("./chat.service");
const chat_gateway_1 = require("./chat.gateway");
const jwt_guard_1 = require("../../../common/guards/jwt.guard");
const contact_request_entity_1 = require("./entities/contact-request.entity");
const conversation_entity_1 = require("./entities/conversation.entity");
const message_entity_1 = require("./entities/message.entity");
const user_entity_1 = require("../auth/entities/user.entity");
let ChatModule = class ChatModule {
};
exports.ChatModule = ChatModule;
exports.ChatModule = ChatModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([contact_request_entity_1.ContactRequest, conversation_entity_1.Conversation, message_entity_1.Message, user_entity_1.User]),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    secret: configService.get('JWT_SECRET'),
                    signOptions: { expiresIn: '15m' },
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [chat_controller_1.ChatController],
        providers: [chat_service_1.ChatService, jwt_guard_1.JwtGuard, chat_gateway_1.ChatGateway],
    })
], ChatModule);
//# sourceMappingURL=chat.module.js.map