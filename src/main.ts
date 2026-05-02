import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { SuccessResponseInterceptor } from './common/success-response.interceptor.js';
import { createSwaggerConfig } from './swagger.js';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    app.enableCors({
        origin: allowedOrigins,
        credentials: true,
        allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new SuccessResponseInterceptor());

    const document = SwaggerModule.createDocument(app, createSwaggerConfig());
    SwaggerModule.setup('api-docs', app, document);

    await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
