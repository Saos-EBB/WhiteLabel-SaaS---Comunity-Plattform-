import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/core/auth/auth.module';
import { MailModule } from './common/mail/mail.module';
import { ProfileModule } from './modules/core/profile/profile.module';
import { ChatModule } from './modules/core/chat/chat.module';
import { NotificationsModule } from './modules/core/notifications/notifications.module';
import { ModerationModule } from './modules/core/moderation/moderation.module';
import { PaymentModule } from './modules/core/payment/payment.module';
import { AdminModule } from './modules/core/admin/admin.module';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';


@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get<number>('database.port'),
        database: configService.get('database.name'),
        username: configService.get('database.user'),
        password: configService.get('database.password'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: configService.get('app.nodeEnv') === 'development',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    MailModule,
    ProfileModule,
    ChatModule,
    NotificationsModule,
    ModerationModule,
    PaymentModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule { }