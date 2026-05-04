import { Module } from '@nestjs/common';
import { RoomService } from './room.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { RoomController } from './room.controller.js';
import { PrismaModule } from '../../database/prisma.module.js';

@Module({
    imports: [AuthModule, PrismaModule],
    controllers: [RoomController],
    providers: [RoomService],
    exports: [RoomService],
})
export class RoomModule {}
