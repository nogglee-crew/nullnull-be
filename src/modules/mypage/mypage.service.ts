import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { ErrorCode } from '../../common/exception/error-codes.js';
import { AppException } from '../../common/exception/app.exception.js';
import { UserStatus } from '../../generated/prisma/enums.js';
import { AuthRepository } from '../auth/auth.repository.js';
import { User } from 'src/generated/prisma/client.js';

@Injectable()
export class MypageService {
    constructor(
        @Inject(PrismaService)
        private readonly prisma: PrismaService,
        private readonly authRepository: AuthRepository,
    ) {}

    // 사용자 닉네임 수정
    async updateNickname(userId: string, nickname: string): Promise<User> {
        const user = await this.authRepository.findUserByIdWithoutTx(userId);
        if (!user || user.status === UserStatus.DELETED) {
            throw new AppException(
                HttpStatus.NOT_FOUND,
                '존재하지 않는 사용자입니다.',
                ErrorCode.USER_NOT_FOUND,
            );
        }

        try {
            return await this.prisma.user.update({
                where: { userId },
                data: { nickname },
            });
        } catch (error) {
            if (error instanceof AppException) throw error;
            throw new AppException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                '내 정보 수정 중 오류가 발생했습니다.',
                ErrorCode.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
