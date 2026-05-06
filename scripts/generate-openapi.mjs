import { mkdirSync, writeFileSync } from 'node:fs';

async function main() {
    console.log('[generate-openapi] start');
    console.log('[generate-openapi] importing modules');
    const [{ NestFactory }, { SwaggerModule }, { AppModule }, { createSwaggerConfig }] =
        await Promise.all([
            import('@nestjs/core'),
            import('@nestjs/swagger'),
            import('../dist/app.module.js'),
            import('../dist/swagger.js'),
        ]);
    console.log('[generate-openapi] modules imported');
    console.log('[generate-openapi] creating Nest app');
    const app = await NestFactory.create(AppModule, { logger: false });
    console.log('[generate-openapi] Nest app created');

    console.log('[generate-openapi] creating Swagger document');
    const document = SwaggerModule.createDocument(app, createSwaggerConfig());
    console.log('[generate-openapi] Swagger document created', Object.keys(document));

    console.log('[generate-openapi] writing openapi.json');
    mkdirSync('src/generated/openapi', { recursive: true });
    writeFileSync('src/generated/openapi/openapi.json', JSON.stringify(document, null, 2));
    console.log('[generate-openapi] openapi.json written');

    await app.close();
    console.log('[generate-openapi] done');
}

main().catch((error) => {
    console.error('[generate-openapi] failed');
    console.error(error instanceof Error ? error.stack : error);
    process.exit(1);
});
