import { HttpStatus, type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import {
    createClient,
    type SupabaseClient,
    type User as SupabaseUser,
} from '@supabase/supabase-js';
import { AppException } from '../../../common/exception/app.exception.js';
import { ErrorCode } from '../../../common/exception/error-codes.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    private supabase: SupabaseClient | null = null;

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authorizationHeader = request.headers['authorization'];

        // request.authUser에는 검증이 끝난 Supabase 인증 사용자만 주입한다.
        request.authUser = await this.verifyAccessToken(authorizationHeader);

        return true;
    }

    protected async verifyAccessToken(
        authorizationHeader: string | undefined,
    ): Promise<SupabaseUser> {
        if (!authorizationHeader) {
            throw new AppException(
                HttpStatus.UNAUTHORIZED,
                '로그인이 필요합니다.',
                ErrorCode.UNAUTHORIZED,
            );
        }

        const [scheme, token] = authorizationHeader.split(' ');
        if (scheme !== 'Bearer' || !token) {
            throw new AppException(
                HttpStatus.UNAUTHORIZED,
                '유효하지 않은 인증 토큰입니다.',
                ErrorCode.UNAUTHORIZED,
            );
        }

        const {
            data: { user },
            error,
        } = await this.getSupabase().auth.getUser(token);
        if (error || !user) {
            throw new AppException(
                HttpStatus.UNAUTHORIZED,
                '인증 정보가 유효하지 않습니다.',
                ErrorCode.UNAUTHORIZED,
            );
        }

        return user;
    }

    // TODO: Supabase client 초기화는 추후 별도 provider/factory로 분리 검토.
    protected getSupabase(): SupabaseClient {
        if (this.supabase) return this.supabase;

        this.supabase = createClient(
            this.requireEnv('SUPABASE_URL'),
            this.requireEnv('SUPABASE_PUBLISHABLE_KEY'),
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                    detectSessionInUrl: false,
                },
            },
        );

        return this.supabase;
    }

    protected requireEnv(key: string): string {
        const value = process.env[key];
        if (!value) throw new Error(`${key} is not set`);
        return value;
    }
}
