import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { TimeUtil } from '../../common/utils/time.util.js';
import { AppException } from '../../common/exception/app.exception.js';
import { ErrorCode } from '../../common/exception/error-codes.js';
import {
    RoomStatus,
    ParticipantStatus,
    PolicyType,
    ParticipantRole,
} from '../../generated/prisma/enums.js';
import { type User as SupabaseUser } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import { CreateRoomRequestDto } from './dto/req/create-room.request.dto.js';
import { CreateRoomResponseDto } from './dto/res/create-room.response.dto.js';
import { RoomPlaceCandidateService } from './room-place-candidate.service.js';
import { RoomRepository } from './room.repository.js';
import dayjs from 'dayjs';

@Injectable()
export class RoomService {
    constructor(
        @Inject(PrismaService)
        private readonly prisma: PrismaService,
        private readonly roomRepository: RoomRepository,
        private readonly roomPlaceCandidateService: RoomPlaceCandidateService,
    ) {}

    // 방 생성 로직
    async createRoom(hostId: string, body: CreateRoomRequestDto): Promise<CreateRoomResponseDto> {
        const { name, dateStart, dateEnd, timeStart, timeEnd, deadlineAt } = body;

        // 1. 시간 데이터 KST 변환 및 기준점 계산
        const nowKst = TimeUtil.nowKst();
        const startKst = TimeUtil.startOfKstDate(dateStart);
        const endKst = TimeUtil.startOfKstDate(dateEnd);
        const deadlineKst = TimeUtil.toDayjsKst(deadlineAt);

        // 2-1. 날짜 범위 검증 (시작일 <= 종료일)
        if (startKst.isAfter(endKst)) {
            throw new AppException(
                HttpStatus.BAD_REQUEST,
                '시작일은 종료일보다 빨라야 합니다.',
                ErrorCode.INVALID_ROOM_INPUT,
            );
        }

        // 2-2. 마감 시간 검증 (현재 시간 < 마감 시간)
        if (deadlineKst.isBefore(nowKst)) {
            throw new AppException(
                HttpStatus.BAD_REQUEST,
                '마감일은 현재 시간 이후여야 합니다.',
                ErrorCode.INVALID_ROOM_INPUT,
            );
        }

        // 2-3. 마감 시간 검증 (마감 시간 < 방 시작 날짜)
        if (deadlineKst.isAfter(startKst) || deadlineKst.isSame(startKst)) {
            throw new AppException(
                HttpStatus.BAD_REQUEST,
                '마감일은 방 시작 날짜 이전이어야 합니다.',
                ErrorCode.INVALID_ROOM_INPUT,
            );
        }

        // 2-4. 시간대 검증 (30분 단위 인덱싱 규칙 준수 확인)
        if (
            !TimeUtil.isValidThirtyMinuteStep(timeStart) ||
            !TimeUtil.isValidThirtyMinuteStep(timeEnd)
        ) {
            throw new AppException(
                HttpStatus.BAD_REQUEST,
                '시간은 30분 단위(00분 또는 30분)로만 설정 가능합니다.',
                ErrorCode.INVALID_ROOM_INPUT,
            );
        }

        // 2-5. 시간대 선후 검증 (시작 시간 < 종료 시간)
        if (timeStart >= timeEnd) {
            throw new AppException(
                HttpStatus.BAD_REQUEST,
                '시작 시간은 종료 시간보다 빨라야 합니다.',
                ErrorCode.INVALID_ROOM_INPUT,
            );
        }

        // 3. 고유 슬러그 생성
        const slug = nanoid(10);

        try {
            // 4. DB 저장 (트랜잭션: 방 생성 + 호스트 참여자 등록)
            const result = await this.prisma.$transaction(async (tx) => {
                const room = await tx.room.create({
                    data: {
                        hostId,
                        slug,
                        name: name,
                        description: body.description,
                        category: body.category,
                        status: RoomStatus.COLLECTING,
                        dateStart: startKst.toDate(),
                        dateEnd: endKst.toDate(),
                        availableDays: body.availableDays as any, // JSON 타입 대응
                        timeStart: TimeUtil.parseTimeToDate(timeStart), // 30분 단위 시간 객체
                        timeEnd: TimeUtil.parseTimeToDate(timeEnd), // 30분 단위 시간 객체
                        deadlineAt: deadlineKst.toDate(),
                        collectOrigin: body.collectOrigin ?? false,
                    },
                });

                // 생성자를 HOST 역할의 참여자로 자동 등록
                await tx.participant.create({
                    data: {
                        roomId: room.roomId,
                        userId: hostId,
                        role: ParticipantRole.HOST,
                        status: ParticipantStatus.JOINED,
                        nickname: '방장',
                    },
                });

                return room;
            });

            return { slug: result.slug };
        } catch (error) {
            if (error instanceof AppException) throw error;

            console.error('Room Creation Failed:', error);
            throw new AppException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                '방 생성 중 오류가 발생했습니다.',
                ErrorCode.INTERNAL_SERVER_ERROR as any,
            );
        }
    }

    // 방 상세 조회 로직
    async getRoomDetail(slug: string, authUser?: SupabaseUser, participantUuid?: string) {
        // 1. 400 Error
        if (!slug || slug.trim().length === 0) {
            throw new AppException(
                HttpStatus.BAD_REQUEST,
                '유효하지 않은 방 요청입니다.',
                ErrorCode.INVALID_ROOM_REQUEST as any,
            );
        }

        try {
            // 2. 방 및 연관 데이터 전체 조회
            const room = await this.prisma.room.findUnique({
                where: { slug },
                include: {
                    host: true,
                    participants: {
                        include: { blockedSlots: true, origin: true },
                    },
                    closure: true,
                    meeting: {
                        include: {
                            timeOption: true,
                            placeOption: true,
                        },
                    },
                },
            });

            if (!room) {
                throw new AppException(
                    HttpStatus.NOT_FOUND,
                    '존재하지 않는 방입니다.',
                    ErrorCode.ROOM_NOT_FOUND as any,
                );
            }

            // 3. 조회자 역할(Role)
            let viewerRole: 'HOST' | 'MEMBER' | 'GUEST' = 'GUEST';
            let myParticipant: any = null;

            if (authUser) {
                if (room.hostId === authUser.id) {
                    viewerRole = 'HOST';
                    myParticipant = room.participants.find((p) => p.userId === authUser.id);
                } else {
                    // 방장은 아닌데, 회원 참여자
                    const foundMember = room.participants.find((p) => p.userId === authUser.id);

                    if (foundMember) {
                        viewerRole = 'MEMBER';
                        myParticipant = foundMember;
                    }
                }
            }

            // 로그인 안 했거나 위에서 못 찾은 경우 UUID로 비회원 참여자 확인
            if (viewerRole === 'GUEST' && participantUuid) {
                const foundGuest = room.participants.find(
                    (p) => p.participantUuid === participantUuid,
                );

                if (foundGuest) {
                    viewerRole = 'MEMBER';
                    myParticipant = foundGuest;
                }
            }

            // 4. 약관 동의 필요 여부
            const consentRequired = await this.checkConsentRequired(viewerRole, authUser);

            // 5. 방 상태에 따른 배지 및 문구
            const { badge, text } = this.resolveRoomDisplay(
                room.status,
                viewerRole,
                room.deadlineAt,
            );

            // 6. 응답 데이터
            return {
                viewer: {
                    role: viewerRole,
                    participantId: myParticipant ? Number(myParticipant.participantId) : null,
                    participantStatus: myParticipant?.status ?? null,
                    nickname: myParticipant?.nickname ?? null,
                    consentRequired,
                },
                room: {
                    roomId: Number(room.roomId),
                    slug: room.slug,
                    name: room.name,
                    description: room.description,
                    category: room.category,
                    status: room.status,
                    hostNickname: room.host.nickname,
                    badge,
                    text,
                    dateStart: room.dateStart.toISOString().split('T')[0],
                    dateEnd: room.dateEnd.toISOString().split('T')[0],
                    availableDays: room.availableDays as number[],
                    timeStart: room.timeStart.toISOString().split('T')[1].substring(0, 5),
                    timeEnd: room.timeEnd.toISOString().split('T')[1].substring(0, 5),
                    collectOrigin: room.collectOrigin,
                    deadlineAt: room.deadlineAt.toISOString(),
                },
                summary: this.calculateSummary(room.participants),
                participants: this.groupParticipantsByStatus(room.participants),
                mySubmission: myParticipant ? this.mapMySubmission(myParticipant) : null,

                // 확정 정보 (CONFIRMED 상태가 아니면 null)
                confirmedMeeting:
                    room.status === RoomStatus.CONFIRMED && room.meeting
                        ? {
                              startAt: TimeUtil.formatKst(room.meeting.timeOption.startAt),
                              endAt: TimeUtil.formatKst(room.meeting.timeOption.endAt),
                              place: room.meeting.placeOption
                                  ? {
                                        name: room.meeting.placeOption.placeName,
                                        address: room.meeting.placeOption.address,
                                    }
                                  : null,
                              confirmedCount: room.meeting.timeOption.availableCount,
                          }
                        : null,
                // 종료 정보 (종료되지 않았으면 null)
                closed: room.closure
                    ? {
                          closedAt: TimeUtil.formatKst(room.closure.closedAt),
                          closedFromStatus: room.closure.closedFromStatus,
                          closedTrigger: room.closure.closedTrigger,
                      }
                    : null,
            };
        } catch (error) {
            if (error instanceof AppException) throw error;
            console.error('Room Inquiry Error:', error);
            throw new AppException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                '방 조회 중 오류가 발생했습니다.',
                ErrorCode.INTERNAL_SERVER_ERROR as any,
            );
        }
    }

    // 약관 동의 필요 여부
    private async checkConsentRequired(role: string, authUser?: SupabaseUser): Promise<boolean> {
        // 1. 이미 참여 완료한 HOST, MEMBER는 무조건 false
        if (role === 'HOST' || role === 'MEMBER') return false;

        // 2. GUEST이면서 로그인 사용자인 경우 동의 이력 확인
        if (authUser) {
            const latestPolicies = await this.prisma.policyVersion.findMany({
                where: {
                    isLatest: true,
                    policyType: { in: [PolicyType.TERMS, PolicyType.PRIVACY] },
                },
            });

            const consent = await this.prisma.userConsent.findFirst({
                where: {
                    userId: authUser.id,
                    termsVersionId: latestPolicies.find((p) => p.policyType === PolicyType.TERMS)
                        ?.policyVersionId,
                    privacyVersionId: latestPolicies.find(
                        (p) => p.policyType === PolicyType.PRIVACY,
                    )?.policyVersionId,
                },
            });
            return !consent; // 이력이 없으면 true
        }

        // 3. GUEST이면서 비회원인 경우 -> 무조건 true
        return true;
    }

    // 위치 정보 매핑
    private mapMySubmission(participant: any) {
        if (!participant) return null;
        return {
            nickname: participant.nickname,
            status: participant.status,
            blockedSlots: participant.blockedSlots.map((s: any) => ({
                date: s.date.toISOString().split('T')[0],
                slotIndex: s.slotIndex,
            })),
            // 출발지 정보 상세화
            origin: participant.origin
                ? {
                      address: participant.origin.address,
                      // Decimal 타입을 숫자로 변환 (지도 라이브러리 연동용)
                      lat: Number(participant.origin.latitude),
                      lng: Number(participant.origin.longitude),
                      placeName: participant.origin.placeName,
                  }
                : null,
        };
    }

    // 방 상태 및 역할에 따른 화면 표시 정보
    private resolveRoomDisplay(status: RoomStatus, role: string, deadlineAt: Date) {
        // 1. 모집중 (COLLECTING)
        if (status === RoomStatus.COLLECTING) {
            const month = deadlineAt.getUTCMonth() + 1;
            const day = deadlineAt.getUTCDate();

            return {
                badge: '모집중',
                text: `${month}월 ${day}일 모집이 마감돼요`,
            };
        }

        // 2. 마감 (READY) - 수집은 끝났으나 확정 전
        if (status === RoomStatus.READY) {
            return {
                badge: '마감',
                text: '모임장의 확정을 기다리고 있어요',
            };
        }

        // 3. 확정 (CONFIRMED)
        if (status === RoomStatus.CONFIRMED) {
            return {
                badge: '확정',
                text: '모임이 확정되었어요',
            };
        }

        // 4. 종료 (CLOSED)
        return {
            badge: '종료',
            text: '종료된 모임이에요',
        };
    }

    // 참여 현황
    private calculateSummary(participants: any[]) {
        const total = participants.length;
        const submitted = participants.filter(
            (p) => p.status === ParticipantStatus.SUBMITTED,
        ).length;
        const ratio = total > 0 ? Math.round((submitted / total) * 100) : 0;

        return {
            totalCount: total,
            submittedCount: submitted,
            declinedCount: participants.filter((p) => p.status === ParticipantStatus.DECLINED)
                .length,
            joinedCount: participants.filter((p) => p.status === ParticipantStatus.JOINED).length,
            submittedRatio: ratio,
        };
    }

    // 참여자 정보
    private groupParticipantsByStatus(participants: any[]) {
        return {
            submitted: participants
                .filter((p) => p.status === ParticipantStatus.SUBMITTED)
                .map((p) => p.nickname),
            declined: participants
                .filter((p) => p.status === ParticipantStatus.DECLINED)
                .map((p) => p.nickname),
            joined: participants
                .filter((p) => p.status === ParticipantStatus.JOINED)
                .map((p) => p.nickname),
        };
    }

    // 방장을 검증한 뒤 제출 데이터를 바탕으로 시간/장소 후보를 생성하고 방을 READY로 전이한다.
    async readyRoom(roomId: bigint, requesterId: string): Promise<void> {
        const room = await this.roomRepository.findRoomForReady(roomId);

        if (!room) {
            throw new AppException(
                HttpStatus.NOT_FOUND,
                '존재하지 않는 방입니다.',
                ErrorCode.ROOM_NOT_FOUND,
            );
        }

        if (room.hostId !== requesterId) {
            throw new AppException(
                HttpStatus.FORBIDDEN,
                '방 마감 권한이 없습니다.',
                ErrorCode.FORBIDDEN,
            );
        }

        if (room.status !== RoomStatus.COLLECTING) {
            throw new AppException(
                HttpStatus.CONFLICT,
                '마감할 수 없는 방 상태입니다.',
                ErrorCode.INVALID_ROOM_STATUS,
            );
        }

        if (room.participants.length === 0) {
            throw new AppException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                '후보를 생성할 수 있는 제출 데이터가 없습니다.',
                ErrorCode.NO_SUBMITTED_PARTICIPANTS,
            );
        }

        const timeCandidates = this.buildTimeCandidates(room);

        if (timeCandidates.length === 0) {
            throw new AppException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                '후보를 생성할 수 있는 제출 데이터가 없습니다.',
                ErrorCode.NO_SUBMITTED_PARTICIPANTS,
            );
        }

        const placeCandidates = room.collectOrigin
            ? await this.roomPlaceCandidateService.buildPlaceCandidates(
                  room.category,
                  room.participants
                      .map((p) => p.origin)
                      .filter(
                          (o): o is NonNullable<(typeof room.participants)[number]['origin']> =>
                              !!o,
                      )
                      .map((o) => ({
                          address: o.address,
                          latitude: Number(o.latitude),
                          longitude: Number(o.longitude),
                      })),
              )
            : [];

        try {
            await this.roomRepository.withTransaction(async (tx) => {
                await this.roomRepository.replaceTimeOptions(tx, roomId, timeCandidates);
                await this.roomRepository.replacePlaceOptions(tx, roomId, placeCandidates);

                const updatedRoom = await this.roomRepository.markRoomReady(
                    tx,
                    roomId,
                    requesterId,
                );

                if (updatedRoom.count !== 1) {
                    throw new AppException(
                        HttpStatus.CONFLICT,
                        '마감할 수 없는 방 상태입니다.',
                        ErrorCode.INVALID_ROOM_STATUS,
                    );
                }
            });
        } catch (error) {
            if (error instanceof AppException) throw error;
            throw new AppException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                '방 마감 중 오류가 발생했습니다.',
                ErrorCode.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // 방의 날짜/요일/시간 범위를 훑어 시간 후보를 만들고, 그중 상위 3개만 최종 후보로 남긴다.
    // 먼저 (date, slotIndex)별 blocked count를 만든 뒤 날짜를 하루씩 순회하면서
    // 각 날짜의 연속 가능 구간을 후보로 수집하고, 마지막에 인원 수/길이/시작 시각 기준으로 정렬한다.
    private buildTimeCandidates(
        room: NonNullable<Awaited<ReturnType<RoomRepository['findRoomForReady']>>>,
    ) {
        const availableDays = this.parseAvailableDays(room.availableDays);
        const startSlotIndex = TimeUtil.timeToSlotIndex(this.formatStoredTime(room.timeStart));
        const endSlotIndex = TimeUtil.timeToSlotIndex(this.formatStoredTime(room.timeEnd));
        const blockedCountMap = this.buildBlockedCountMap(room, startSlotIndex, endSlotIndex);
        const submittedCount = room.participants.length;
        const candidates: Array<{
            date: Date;
            startAt: Date;
            endAt: Date;
            availableCount: number;
            durationMinutes: number;
        }> = [];

        let cursor = TimeUtil.startOfKstDate(room.dateStart);
        const endDate = TimeUtil.startOfKstDate(room.dateEnd);

        // 시작일부터 종료일까지 하루씩 넘겨가며, 입력 가능한 요일에만 시간 후보를 계산한다.
        while (cursor.isBefore(endDate) || cursor.isSame(endDate)) {
            if (availableDays.includes(cursor.day())) {
                candidates.push(
                    ...this.buildCandidatesForDate(
                        cursor,
                        startSlotIndex,
                        endSlotIndex,
                        submittedCount,
                        blockedCountMap,
                    ),
                );
            }

            cursor = cursor.add(1, 'day');
        }

        return candidates
            .sort((left, right) => {
                // 더 많은 사람이 가능한 후보를 우선하고, 같으면 더 긴 구간,
                // 그것도 같으면 더 이른 시각을 우선한다.
                if (right.availableCount !== left.availableCount) {
                    return right.availableCount - left.availableCount;
                }

                if (right.durationMinutes !== left.durationMinutes) {
                    return right.durationMinutes - left.durationMinutes;
                }

                return left.startAt.getTime() - right.startAt.getTime();
            })
            .slice(0, 3)
            .map((candidate, index) => ({
                ...candidate,
                rank: index + 1,
            }));
    }

    // 제출된 모든 blocked slot을 훑어 (date, slotIndex)별로 몇 명이 해당 슬롯을 막았는지 집계
    private buildBlockedCountMap(
        room: NonNullable<Awaited<ReturnType<RoomRepository['findRoomForReady']>>>,
        startSlotIndex: number,
        endSlotIndex: number,
    ): Map<string, number> {
        const blockedCountMap = new Map<string, number>();

        for (const participant of room.participants) {
            for (const blockedSlot of participant.blockedSlots) {
                if (blockedSlot.slotIndex < startSlotIndex || blockedSlot.slotIndex >= endSlotIndex)
                    continue;

                const key = `${TimeUtil.startOfKstDate(blockedSlot.date).format('YYYY-MM-DD')}:${blockedSlot.slotIndex}`;
                blockedCountMap.set(key, (blockedCountMap.get(key) ?? 0) + 1);
            }
        }
        return blockedCountMap;
    }

    // 하루 단위로 가능한 슬롯을 훑어 연속 구간 후보를 생성
    // 같은 availableCount가 유지되는 동안은 하나의 시간 후보로 합치고,
    // 인원 수가 바뀌거나 0명이 되는 지점에서 후보를 끊는다.
    private buildCandidatesForDate(
        date: dayjs.Dayjs,
        startSlotIndex: number,
        endSlotIndex: number,
        submittedCount: number,
        blockedCountMap: Map<string, number>,
    ) {
        const candidates: Array<{
            date: Date;
            startAt: Date;
            endAt: Date;
            availableCount: number;
            durationMinutes: number;
        }> = [];
        let intervalStartIndex: number | null = null;
        let intervalAvailableCount: number | null = null;

        for (let slotIndex = startSlotIndex; slotIndex < endSlotIndex; slotIndex += 1) {
            const key = `${date.format('YYYY-MM-DD')}:${slotIndex}`;
            const availableCount = submittedCount - (blockedCountMap.get(key) ?? 0);

            // 이 슬롯에 가능한 사람이 없으면 현재까지 쌓은 연속 구간을 마감하고 다음 후보를 새로 찾기
            if (availableCount <= 0) {
                this.pushTimeCandidate(
                    candidates,
                    date,
                    intervalStartIndex,
                    slotIndex,
                    intervalAvailableCount,
                );
                intervalStartIndex = null;
                intervalAvailableCount = null;
                continue;
            }

            // 새로운 연속 구간을 시작하는 첫 슬롯
            if (intervalStartIndex === null) {
                intervalStartIndex = slotIndex;
                intervalAvailableCount = availableCount;
                continue;
            }

            // 같은 연속 구간 안에서도 가능한 인원 수가 바뀌면 별도 후보로 분리
            if (intervalAvailableCount !== availableCount) {
                this.pushTimeCandidate(
                    candidates,
                    date,
                    intervalStartIndex,
                    slotIndex,
                    intervalAvailableCount,
                );
                intervalStartIndex = slotIndex;
                intervalAvailableCount = availableCount;
            }
        }

        this.pushTimeCandidate(
            candidates,
            date,
            intervalStartIndex,
            endSlotIndex,
            intervalAvailableCount,
        );

        return candidates;
    }

    // buildCandidatesForDate에서 찾은 연속 구간을 실제 저장 후보 형태로 변환해 결과 배열에 추가
    private pushTimeCandidate(
        candidates: Array<{
            date: Date;
            startAt: Date;
            endAt: Date;
            availableCount: number;
            durationMinutes: number;
        }>,
        date: dayjs.Dayjs,
        startSlotIndex: number | null,
        endSlotIndex: number,
        availableCount: number | null,
    ) {
        // 시작점이 없거나 길이가 0 이하인 구간은 유효한 시간 후보가 아니므로 버린다.
        if (startSlotIndex === null || availableCount === null || endSlotIndex <= startSlotIndex)
            return;

        const startAt = TimeUtil.parseTimeToDate(TimeUtil.slotIndexToTime(startSlotIndex));
        const endAt = TimeUtil.parseTimeToDate(TimeUtil.slotIndexToTime(endSlotIndex));

        candidates.push({
            date: TimeUtil.toUtcDateOnly(date.format('YYYY-MM-DD')),
            startAt,
            endAt,
            availableCount,
            durationMinutes: (endSlotIndex - startSlotIndex) * 30,
        });
    }

    // room.availableDays는 JSON 컬럼이라 unknown 형태로 들어오므로,
    // 후보 계산에 쓸 수 있도록 0~6 범위의 정수 요일만 남겨 정제한다.
    private parseAvailableDays(availableDays: unknown): number[] {
        if (!Array.isArray(availableDays)) return [];
        return availableDays.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6);
    }

    // DB TIME 컬럼은 Date 객체 형태로 들어오므로, slot index 계산에 다시 사용할 수 있게 HH:mm 문자열로 되돌린다.
    private formatStoredTime(time: Date): string {
        const hours = String(time.getUTCHours()).padStart(2, '0');
        const minutes = String(time.getUTCMinutes()).padStart(2, '0');

        return `${hours}:${minutes}`;
    }
}
