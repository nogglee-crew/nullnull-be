import { mkdirSync, writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../dist/app.module.js';
import { createSwaggerConfig } from '../dist/swagger.js';

async function main() {
    const app = await NestFactory.create(AppModule, { logger: false });

    const document = SwaggerModule.createDocument(app, createSwaggerConfig());

    mkdirSync('src/generated/openapi', { recursive: true });
    writeFileSync('src/generated/openapi/openapi.json', JSON.stringify(document, null, 2));

    await app.close();
}

main().catch((error) => {
    console.error('[generate-openapi] failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
