import { HttpStatus, Injectable } from '@nestjs/common';
import {
    createClient,
    type SupabaseClient,
    type User as SupabaseUser,
} from '@supabase/supabase-js';
import { AppException } from '../../common/exception/app.exception.js';
import { ErrorCode } from '../../common/exception/error-codes.js';

@Injectable()
export class SupabaseAuthService {
    private supabase: SupabaseClient | null = null;

    authenticate(authorizationHeader: string | undefined): Promise<SupabaseUser> {
        const accessToken = this.extractBearerToken(authorizationHeader);
        return this.verifyAccessToken(accessToken);
    }

    // INFO: Authorization header에서 Bearer access token을 추출한다.
    extractBearerToken(authorizationHeader: string | undefined): string {
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
                ErrorCode.INVALID_REQUEST,
            );
        }

        return token;
    }

    // INFO: Supabase access token을 서버에서 검증하고 인증 사용자를 반환한다.
    async verifyAccessToken(accessToken: string): Promise<SupabaseUser> {
        const {
            data: { user },
            error,
        } = await this.getSupabase().auth.getUser(accessToken);

        if (error || !user) {
            throw new AppException(
                HttpStatus.UNAUTHORIZED,
                '인증 정보가 유효하지 않습니다.',
                ErrorCode.UNAUTHORIZED,
            );
        }

        return user;
    }

    // INFO: Supabase client를 지연 초기화해 재사용한다.
    private getSupabase(): SupabaseClient {
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

    // INFO: 필수 환경변수 값을 조회하고 누락 시 설정 오류를 발생시킨다.
    private requireEnv(key: string): string {
        const value = process.env[key];
        if (!value) throw new Error(`${key} is not set`);
        return value;
    }
}
