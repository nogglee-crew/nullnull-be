import { Module } from '@nestjs/common';
import { RoomService } from './room.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { RoomController } from './room.controller.js';

@Module({
    imports: [AuthModule],
    controllers: [RoomController],
    providers: [RoomService],
    exports: [RoomService],
})
export class RoomModule {}
