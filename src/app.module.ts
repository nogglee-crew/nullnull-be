import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { PrismaModule } from './database/prisma.module.js';
import { RoomModule } from './modules/room/room.module.js';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        AuthModule,
        PrismaModule,
        RoomModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
