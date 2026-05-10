import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import {
    type ParticipantRole,
    ParticipantStatus,
    type RoomCategory,
    RoomStatus,
} from '../../generated/prisma/enums.js';

type RoomTransactionClient = Pick<
    PrismaService,
    'participant' | 'placeOption' | 'room' | 'timeOption'
>;

@Injectable()
export class RoomRepository {
    constructor(
        @Inject(PrismaService)
        private readonly prisma: PrismaService,
    ) {}

    withTransaction<T>(callback: (tx: RoomTransactionClient) => Promise<T>): Promise<T> {
        return this.prisma.$transaction(async (tx) => callback(tx as RoomTransactionClient));
    }

    createRoom(
        tx: RoomTransactionClient,
        params: {
            hostId: string;
            slug: string;
            name: string;
            description?: string;
            category: RoomCategory;
            dateStart: Date;
            dateEnd: Date;
            availableDays: number[];
            timeStart: Date;
            timeEnd: Date;
            deadlineAt: Date;
            collectOrigin: boolean;
        },
    ) {
        return tx.room.create({
            data: {
                hostId: params.hostId,
                slug: params.slug,
                name: params.name,
                description: params.description,
                category: params.category,
                status: RoomStatus.COLLECTING,
                dateStart: params.dateStart,
                dateEnd: params.dateEnd,
                availableDays: params.availableDays as any,
                timeStart: params.timeStart,
                timeEnd: params.timeEnd,
                deadlineAt: params.deadlineAt,
                collectOrigin: params.collectOrigin,
            },
        });
    }

    createHostParticipant(
        tx: RoomTransactionClient,
        params: {
            roomId: bigint;
            userId: string;
            role: ParticipantRole;
            nickname: string;
        },
    ) {
        return tx.participant.create({
            data: {
                roomId: params.roomId,
                userId: params.userId,
                role: params.role,
                status: ParticipantStatus.JOINED,
                nickname: params.nickname,
            },
        });
    }

    findRoomForReady(roomId: bigint) {
        return this.prisma.room.findUnique({
            where: { roomId },
            select: {
                roomId: true,
                hostId: true,
                status: true,
                category: true,
                dateStart: true,
                dateEnd: true,
                availableDays: true,
                timeStart: true,
                timeEnd: true,
                collectOrigin: true,
                participants: {
                    where: {
                        status: ParticipantStatus.SUBMITTED,
                    },
                    select: {
                        blockedSlots: {
                            select: {
                                date: true,
                                slotIndex: true,
                            },
                        },
                        origin: {
                            select: {
                                address: true,
                                latitude: true,
                                longitude: true,
                            },
                        },
                    },
                },
            },
        });
    }

    replaceTimeOptions(
        tx: RoomTransactionClient,
        roomId: bigint,
        candidates: Array<{
            date: Date;
            startAt: Date;
            endAt: Date;
            availableCount: number;
            durationMinutes: number;
            rank: number;
        }>,
    ) {
        return tx.timeOption.deleteMany({ where: { roomId } }).then(async () => {
            await tx.timeOption.createMany({
                data: candidates.map((candidate) => ({
                    roomId,
                    date: candidate.date,
                    startAt: candidate.startAt,
                    endAt: candidate.endAt,
                    availableCount: candidate.availableCount,
                    durationMinutes: candidate.durationMinutes,
                    rank: candidate.rank,
                })),
            });
        });
    }

    replacePlaceOptions(
        tx: RoomTransactionClient,
        roomId: bigint,
        candidates: Array<{
            placeName: string;
            latitude: number;
            longitude: number;
            address: string;
            averageDistance: number;
            totalDistance: number;
            rank: number;
        }>,
    ) {
        return tx.placeOption.deleteMany({ where: { roomId } }).then(async () => {
            if (candidates.length === 0) return;

            await tx.placeOption.createMany({
                data: candidates.map((candidate) => ({
                    roomId,
                    placeName: candidate.placeName,
                    latitude: candidate.latitude,
                    longitude: candidate.longitude,
                    address: candidate.address,
                    averageDistance: candidate.averageDistance,
                    totalDistance: candidate.totalDistance,
                    rank: candidate.rank,
                })),
            });
        });
    }

    markRoomReady(tx: RoomTransactionClient, roomId: bigint, hostId: string) {
        return tx.room.updateMany({
            where: {
                roomId,
                hostId,
                status: RoomStatus.COLLECTING,
            },
            data: {
                status: RoomStatus.READY,
            },
        });
    }
}
