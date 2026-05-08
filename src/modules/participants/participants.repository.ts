import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { type ParticipantRole, ParticipantStatus } from '../../generated/prisma/enums.js';

type ParticipantsTransactionClient = Pick<
    PrismaService,
    'participant' | 'policyVersion' | 'room' | 'user' | 'userConsent'
>;

@Injectable()
export class ParticipantsRepository {
    constructor(
        @Inject(PrismaService)
        private readonly prisma: PrismaService,
    ) {}

    withTransaction<T>(callback: (tx: ParticipantsTransactionClient) => Promise<T>): Promise<T> {
        return this.prisma.$transaction(async (tx) =>
            callback(tx as ParticipantsTransactionClient),
        );
    }

    findRoomForJoin(tx: ParticipantsTransactionClient, roomId: bigint) {
        return tx.room.findUnique({
            where: { roomId },
            select: { roomId: true, slug: true, status: true, hostId: true },
        });
    }

    updateUserNickname(tx: ParticipantsTransactionClient, userId: string, nickname: string) {
        return tx.user.update({
            where: { userId },
            data: { nickname },
        });
    }

    findParticipantByUserId(tx: ParticipantsTransactionClient, roomId: bigint, userId: string) {
        return tx.participant.findFirst({
            where: { roomId, userId },
        });
    }

    findParticipantByUuid(
        tx: ParticipantsTransactionClient,
        roomId: bigint,
        participantUuid: string,
    ) {
        return tx.participant.findFirst({
            where: { roomId, participantUuid },
        });
    }

    createParticipant(
        tx: ParticipantsTransactionClient,
        params: {
            roomId: bigint;
            userId?: string;
            participantUuid?: string;
            nickname: string;
            role: ParticipantRole;
            termsVersionId: bigint;
            privacyVersionId: bigint;
            agreedAt: Date;
        },
    ) {
        return tx.participant.create({
            data: {
                roomId: params.roomId,
                userId: params.userId,
                participantUuid: params.participantUuid,
                nickname: params.nickname,
                role: params.role,
                status: ParticipantStatus.JOINED,
                termsVersionId: params.termsVersionId,
                privacyVersionId: params.privacyVersionId,
                agreedAt: params.agreedAt,
            },
        });
    }
}
