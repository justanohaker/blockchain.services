import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe, HttpException, HttpStatus } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { respFailure, RespErrorCode } from './libs/responseHelper';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    exceptionFactory: (errors: ValidationError[]) => {
      let msg = '';
      for (const err of errors) {
        msg += err.toString();
      }
      return new HttpException(
        respFailure(RespErrorCode.BAD_REQUEST, msg),
        HttpStatus.OK
      );
    }
  }));

  const options = new DocumentBuilder()
    .setTitle('多链多资产服务器API')
    .setDescription('多链多资产服务器API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(3000);
}
bootstrap();



