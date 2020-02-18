import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const options = new DocumentBuilder()
    .setTitle('多链多资产服务器API')
    .setDescription('多链多资产服务器API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(3000);
}
bootstrap();

// TEST
import { bcryptHelper } from './libs/helpers/bcryptHelper';
import { sjclHelper } from './libs/helpers/sjclHelper';

async function main() {
  // const plaintext = "hello world";
  // const otherPlainText = "Hello world";

  // const hash = await bcryptHelper.hash(plaintext);
  // console.log(`hash: ${hash}`);
  // let same = await bcryptHelper.compare(plaintext, hash);
  // console.log(`hash compare: ${same} with (${plaintext}, ${hash})`);
  // same = await bcryptHelper.compare(otherPlainText, hash);
  // console.log(`hash compare: ${same} with (${otherPlainText}, ${hash})`);

  const result = await sjclHelper.encrypt('helloworld');

  console.log('result:', result);

  const txt = await sjclHelper.decrypt(result);
  console.log('decrypt:', txt);
}
main();
