import { Module } from '@nestjs/common';
import { RoomService } from './room.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { RoomController } from './room.controller.js';
import { RoomPlaceCandidateService } from './room-place-candidate.service.js';
import { RoomRepository } from './room.repository.js';

@Module({
    imports: [AuthModule],
    controllers: [RoomController],
    providers: [RoomService, RoomPlaceCandidateService, RoomRepository],
    exports: [RoomService],
})
export class RoomModule {}
