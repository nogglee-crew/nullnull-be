import { DocumentBuilder } from '@nestjs/swagger';

export function createSwaggerConfig() {
    return new DocumentBuilder()
        .setTitle('NULLNULL API')
        .setDescription('NULLNULL backend API documentation')
        .setVersion('1.0.0')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'accessToken')
        .build();
}
