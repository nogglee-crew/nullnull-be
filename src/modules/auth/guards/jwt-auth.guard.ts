import {
    type CanActivate,
    type ExecutionContext,
    Injectable,
    Inject,
    HttpStatus,
} from '@nestjs/common';
import { AuthService } from '../auth.service.js';
import { AppException } from '../../../common/exception/app.exception.js';
import { ErrorCode } from '../../../common/exception/error-codes.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        @Inject(AuthService)
        private readonly authService: AuthService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        const authorization = request.headers['authorization'];

        if (!authorization) {
            throw new AppException(
                HttpStatus.UNAUTHORIZED,
                '로그인이 필요합니다.',
                ErrorCode.UNAUTHORIZED as any,
            );
        }

        try {
            const user = await this.authService.validateTokenAndGetUser(authorization);

            request.user = user;

            return true;
        } catch (error) {
            if (error instanceof AppException) {
                throw error;
            }

            throw new AppException(
                HttpStatus.UNAUTHORIZED,
                '유효하지 않은 인증 토큰입니다.',
                ErrorCode.UNAUTHORIZED as any,
            );
        }
    }
}
