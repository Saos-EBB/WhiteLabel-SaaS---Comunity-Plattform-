import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? 'https://deine-app.com'
      : '*',
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.setGlobalPrefix('api/v1');

  await app.getHttpAdapter().getInstance().set('trust proxy', 1);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Paarship API läuft auf Port ${process.env.PORT ?? 3000}`);
}
bootstrap();