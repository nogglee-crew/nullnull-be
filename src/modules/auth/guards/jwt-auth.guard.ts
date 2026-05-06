import { Inject, type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { SupabaseAuthService } from '../supabase-auth.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        @Inject(SupabaseAuthService)
        private readonly supabaseAuthService: SupabaseAuthService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authorization = request.headers['authorization'];

        request.user = await this.supabaseAuthService.authenticate(authorization);

        return true;
    }
}
