import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { PrismaModule } from '../../database/prisma.module.js';
import { JwtAuthGuard } from './guard/jwt-auth.guard.js';

@Module({
    imports: [PrismaModule],
    controllers: [AuthController],
    providers: [AuthRepository, AuthService, JwtAuthGuard],
    exports: [AuthRepository, AuthService, JwtAuthGuard],
})
export class AuthModule {}
