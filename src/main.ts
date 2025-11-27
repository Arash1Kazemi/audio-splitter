import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(9001);
  console.log('Application is running on: http://localhost:9001');
}
bootstrap();
