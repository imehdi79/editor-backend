import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const config = app.get(ConfigService);

  app.enableShutdownHooks();

  const port = config.get<number>('PORT') ?? 8787;
  await app.listen(port, '0.0.0.0');
  console.log(`Construct Editor backend listening on http://localhost:${port}`);
}

void bootstrap();
