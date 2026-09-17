import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import type { Environment } from './config/environment';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService<Environment, true>);

  app.disable('x-powered-by');
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();

  if (config.get('NODE_ENV', { infer: true }) === 'development') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('PS Dashboard API')
      .setDescription('Workforce dashboard endpoints')
      .setVersion('1.0')
      .build();

    SwaggerModule.setup('docs', app, () =>
      SwaggerModule.createDocument(app, swaggerConfig),
    );
  }

  const port = config.get('PORT', { infer: true });
  await app.listen(port, '127.0.0.1');
}

void bootstrap();
