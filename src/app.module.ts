import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { PrismaModule } from './database/prisma.module.js';
import { ParticipantsModule } from './modules/participants/participants.module.js';
import { RoomModule } from './modules/room/room.module.js';
import { MypageModule } from './modules/mypage/mypage.module.js';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        AuthModule,
        PrismaModule,
        ParticipantsModule,
        RoomModule,
        MypageModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
