import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PrismaModule } from '../../database/prisma.module.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { SupabaseAuthService } from './supabase-auth.service.js';

@Module({
    imports: [PrismaModule],
    controllers: [AuthController],
    providers: [AuthService, SupabaseAuthService, JwtAuthGuard],
    exports: [AuthService, SupabaseAuthService, JwtAuthGuard],
})
export class AuthModule {}
