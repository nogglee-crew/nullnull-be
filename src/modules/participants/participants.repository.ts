import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { type ParticipantRole, ParticipantStatus } from '../../generated/prisma/enums.js';

type ParticipantsTransactionClient = Pick<
    PrismaService,
    'blockedSlot' | 'origin' | 'participant' | 'policyVersion' | 'room' | 'user' | 'userConsent'
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

    findParticipantForParticipation(tx: ParticipantsTransactionClient, participantId: bigint) {
        return tx.participant.findUnique({
            where: { participantId },
            select: {
                participantId: true,
                userId: true,
                participantUuid: true,
                room: {
                    select: {
                        collectOrigin: true,
                        slug: true,
                        status: true,
                    },
                },
            },
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

    replaceBlockedSlots(
        tx: ParticipantsTransactionClient,
        participantId: bigint,
        blockedSlots: { date: Date; slotIndex: number }[],
    ) {
        return tx.blockedSlot.deleteMany({ where: { participantId } }).then(async () => {
            if (blockedSlots.length === 0) return;

            await tx.blockedSlot.createMany({
                data: blockedSlots.map((blockedSlot) => ({
                    participantId,
                    date: blockedSlot.date,
                    slotIndex: blockedSlot.slotIndex,
                })),
            });
        });
    }

    upsertOrigin(
        tx: ParticipantsTransactionClient,
        participantId: bigint,
        origin: { address: string; lat: number; lng: number },
    ) {
        return tx.origin.upsert({
            where: { participantId },
            update: {
                address: origin.address,
                latitude: origin.lat,
                longitude: origin.lng,
            },
            create: {
                participantId,
                address: origin.address,
                latitude: origin.lat,
                longitude: origin.lng,
            },
        });
    }

    updateParticipantStatus(
        tx: ParticipantsTransactionClient,
        participantId: bigint,
        status: ParticipantStatus,
    ) {
        return tx.participant.update({
            where: { participantId },
            data: { status },
        });
    }
}
