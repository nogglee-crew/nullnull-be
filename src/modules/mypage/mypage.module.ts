import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MypageController } from './mypage.controller.js';
import { MypageService } from './mypage.service.js';

@Module({
    imports: [AuthModule],
    controllers: [MypageController],
    providers: [MypageService],
    exports: [MypageService],
})
export class MypageModule {}
