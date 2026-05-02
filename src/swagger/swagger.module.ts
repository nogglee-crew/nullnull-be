import { Module } from '@nestjs/common';
import { AuthController } from '../modules/auth/auth.controller.js';

@Module({
    controllers: [AuthController],
    providers: [
        {
            provide: 'AuthService',
            useValue: {},
        },
    ],
})
export class SwaggerAppModule {}
