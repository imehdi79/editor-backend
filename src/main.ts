import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const config = app.get(ConfigService);

  // Only the envelope is validated; whitelist strips unknown top-level props.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Consistent { error: { message } } envelope for all 4xx/5xx.
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableShutdownHooks();

  const port = config.get<number>('PORT') ?? 8787;
  await app.listen(port, '0.0.0.0');
  console.log(`Construct Editor backend listening on http://localhost:${port}`);
}

void bootstrap();
