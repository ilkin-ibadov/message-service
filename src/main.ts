import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as process from "process";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api")
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }))

  const config = new DocumentBuilder()
    .setTitle("Message service API")
    .setDescription("API documentation for the Message microservice")
    .setVersion("1.0")
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup("docs/messages", app, document)

  app.enableCors()

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
