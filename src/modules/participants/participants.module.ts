import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ParticipantsController } from './participants.controller.js';
import { ParticipantsRepository } from './participants.repository.js';
import { ParticipantsService } from './participants.service.js';

@Module({
    imports: [AuthModule],
    controllers: [ParticipantsController],
    providers: [ParticipantsRepository, ParticipantsService],
    exports: [ParticipantsRepository, ParticipantsService],
})
export class ParticipantsModule {}
