import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule } from '@nestjs/swagger';
import { swaggerConfig } from '@/core/docs/swagger.config';
import {
  ClassSerializerInterceptor,
  HttpException,
  HttpStatus,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ResponseInterceptor } from '@/common/interceptors/request.interceptors';
import { ErrorExceptionFilter } from '@/common/filters/errors.filter';
import cookieParser from 'cookie-parser';
import { ORMExceptionFilter } from './common/filters/db-errors.filter';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Replace default logger with Pino
  app.useLogger(app.get(Logger));

  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const details = errors.reduce(
          (acc, error) => {
            acc[error.property] = Object.values(error.constraints || {}).join(
              ', ',
            );
            return acc;
          },
          {} as Record<string, string>,
        );
        return new HttpException(
          {
            code: 'VALIDATION_FAILED',
            message: 'The request contains invalid data',
            details,
          },
          HttpStatus.BAD_REQUEST,
        );
      },
    }),
  );
  app.useGlobalFilters(new ErrorExceptionFilter(), new ORMExceptionFilter());
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new ResponseInterceptor(),
  );

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('swagger', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
