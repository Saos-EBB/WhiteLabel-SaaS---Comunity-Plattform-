import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  if (!process.env.CORS_ORIGIN) throw new Error('CORS_ORIGIN env var is not set');
  const corsOrigin = process.env.CORS_ORIGIN;

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  app.use(cookieParser());
  app.use(helmet());

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.setGlobalPrefix('api/v1');

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  await app.getHttpAdapter().getInstance().set('trust proxy', 1);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();