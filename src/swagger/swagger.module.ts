import { Module } from '@nestjs/common';
import { AuthController } from '../modules/auth/auth.controller.js';
import { AuthService } from '../modules/auth/auth.service.js';

@Module({
    controllers: [AuthController],
    providers: [
        {
            provide: AuthService,
            useValue: {
                syncUser: async () => null,
                recordConsent: async () => null,
            },
        },
    ],
})
export class SwaggerAppModule {}
