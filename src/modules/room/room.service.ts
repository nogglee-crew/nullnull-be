import { Injectable, HttpStatus } from '@nestjs/common';
import dayjs from 'dayjs';
import { nanoid } from 'nanoid';
import { CreateRoomRequestDto } from './dto/req/create-room.request.dto.js';
import { CreateRoomResponseDto } from './dto/res/create-room.response.dto.js';
import { ReadRoomCandidatesResponseDto } from './dto/res/read-room-candidates.response.dto.js';
import { AppException } from '../../common/exception/app.exception.js';
import { ErrorCode } from '../../common/exception/error-codes.js';
import { ParticipantRole, RoomStatus } from '../../generated/prisma/enums.js';
import { TimeUtil } from '../../common/utils/time.util.js';
import { RoomPlaceCandidateService } from './room-place-candidate.service.js';
import { RoomRepository } from './room.repository.js';

@Injectable()
export class RoomService {
    constructor(
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
            const result = await this.roomRepository.withTransaction(async (tx) => {
                const room = await this.roomRepository.createRoom(tx, {
                    hostId,
                    slug,
                    name,
                    description: body.description,
                    category: body.category,
                    dateStart: TimeUtil.toUtcDateOnly(dateStart),
                    dateEnd: TimeUtil.toUtcDateOnly(dateEnd),
                    availableDays: body.availableDays,
                    timeStart: TimeUtil.parseTimeToDate(timeStart),
                    timeEnd: TimeUtil.parseTimeToDate(timeEnd),
                    deadlineAt: deadlineKst.toDate(),
                    collectOrigin: body.collectOrigin ?? false,
                });

                await this.roomRepository.createHostParticipant(tx, {
                    roomId: room.roomId,
                    userId: hostId,
                    role: ParticipantRole.HOST,
                    nickname: '방장',
                });

                return room;
            });

            return { slug: result.slug };
        } catch (error) {
            if (error instanceof AppException) throw error;
            throw new AppException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                '방 생성 중 오류가 발생했습니다.',
                ErrorCode.INTERNAL_SERVER_ERROR as any,
            );
        }
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

    // READY 상태의 방에서 이미 생성된 시간/장소 후보를 rank 순으로 조회한다.
    async readRoomCandidates(
        roomId: bigint,
        requesterId: string,
    ): Promise<ReadRoomCandidatesResponseDto> {
        const room = await this.roomRepository.findRoomForCandidates(roomId);

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
                '후보 조회 권한이 없습니다.',
                ErrorCode.FORBIDDEN,
            );
        }

        if (room.status !== RoomStatus.READY) {
            throw new AppException(
                HttpStatus.CONFLICT,
                '후보를 조회할 수 없는 방 상태입니다.',
                ErrorCode.INVALID_ROOM_STATUS,
            );
        }

        return {
            submittedParticipantCount: room.participants.length,
            timeCandidates: room.timeOptions.map((candidate) => ({
                id: Number(candidate.timeOptionId),
                date: TimeUtil.startOfKstDate(candidate.date).format('YYYY-MM-DD'),
                startAt: this.formatStoredTime(candidate.startAt),
                endAt: this.formatStoredTime(candidate.endAt),
                availableCount: candidate.availableCount,
                durationMinutes: candidate.durationMinutes,
                rank: candidate.rank,
                unavailableParticipants: this.findUnavailableParticipants(room, candidate),
            })),
            placeCandidates: room.collectOrigin
                ? room.placeOptions.map((candidate) => ({
                      id: Number(candidate.placeOptionId),
                      name: candidate.placeName,
                      address: candidate.address,
                      latitude: Number(candidate.latitude),
                      longitude: Number(candidate.longitude),
                      rank: candidate.rank,
                  }))
                : [],
        };
    }

    // 시간 후보 구간과 겹치는 blocked slot이 있는 참여자만 골라 불가자 목록으로 만든다.
    private findUnavailableParticipants(
        room: NonNullable<Awaited<ReturnType<RoomRepository['findRoomForCandidates']>>>,
        candidate: NonNullable<
            Awaited<ReturnType<RoomRepository['findRoomForCandidates']>>
        >['timeOptions'][number],
    ) {
        const candidateDate = TimeUtil.startOfKstDate(candidate.date).format('YYYY-MM-DD');
        const startSlotIndex = TimeUtil.timeToSlotIndex(this.formatStoredTime(candidate.startAt));
        const endSlotIndex = TimeUtil.timeToSlotIndex(this.formatStoredTime(candidate.endAt));

        return room.participants
            .filter((p) =>
                p.blockedSlots.some((bs) => {
                    const blockedDate = TimeUtil.startOfKstDate(bs.date).format('YYYY-MM-DD');

                    return (
                        blockedDate === candidateDate &&
                        bs.slotIndex >= startSlotIndex &&
                        bs.slotIndex < endSlotIndex
                    );
                }),
            )
            .map((p) => ({ participantId: Number(p.participantId), nickname: p.nickname }));
    }

    // 방의 날짜/요일/시간 범위를 훑어 시간 후보를 만들고, 그중 상위 3개만 최종 후보로 남긴다.
    // 먼저 (date, slotIndex)별 blocked participant 집합을 만든 뒤 날짜를 하루씩 순회하면서
    // 각 날짜의 연속 가능 구간을 후보로 수집하고, 마지막에 인원 수/길이/시작 시각 기준으로 정렬한다.
    private buildTimeCandidates(
        room: NonNullable<Awaited<ReturnType<RoomRepository['findRoomForReady']>>>,
    ) {
        const availableDays = this.parseAvailableDays(room.availableDays);
        const startSlotIndex = TimeUtil.timeToSlotIndex(this.formatStoredTime(room.timeStart));
        const endSlotIndex = TimeUtil.timeToSlotIndex(this.formatStoredTime(room.timeEnd));
        const blockedParticipantMap = this.buildBlockedParticipantMap(
            room,
            startSlotIndex,
            endSlotIndex,
        );
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
                        blockedParticipantMap,
                    ),
                );
            }

            cursor = cursor.add(1, 'day');
        }

        return candidates
            .sort((a, b) => {
                // 더 많은 사람이 가능한 후보를 우선하고, 같으면 더 긴 구간,
                // 그것도 같으면 더 이른 시각을 우선한다.
                if (b.availableCount !== a.availableCount)
                    return b.availableCount - a.availableCount;
                if (b.durationMinutes !== a.durationMinutes)
                    return b.durationMinutes - a.durationMinutes;

                return a.startAt.getTime() - b.startAt.getTime();
            })
            .slice(0, 3)
            .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
    }

    // 제출된 모든 blocked slot을 훑어 (date, slotIndex)별로 누가 해당 슬롯을 막았는지 집계한다.
    // 단순 count만 저장하면 "가능 인원 수는 같지만 실제 가능한 사람이 다른 슬롯"을 같은 후보로 묶는 문제가 생긴다.
    private buildBlockedParticipantMap(
        room: NonNullable<Awaited<ReturnType<RoomRepository['findRoomForReady']>>>,
        startSlotIndex: number,
        endSlotIndex: number,
    ): Map<string, Set<number>> {
        const blockedParticipantMap = new Map<string, Set<number>>();

        for (const [participantIndex, participant] of room.participants.entries()) {
            for (const blockedSlot of participant.blockedSlots) {
                if (blockedSlot.slotIndex < startSlotIndex || blockedSlot.slotIndex >= endSlotIndex)
                    continue;

                const key = `${TimeUtil.startOfKstDate(blockedSlot.date).format('YYYY-MM-DD')}:${blockedSlot.slotIndex}`;
                const blockedParticipants = blockedParticipantMap.get(key) ?? new Set<number>();
                blockedParticipants.add(participantIndex);
                blockedParticipantMap.set(key, blockedParticipants);
            }
        }
        return blockedParticipantMap;
    }

    // 하루 단위로 가능한 슬롯을 훑어 연속 구간 후보를 생성
    // 같은 availableCount뿐 아니라 "실제로 가능한 참여자 집합"이 유지되는 동안만 하나의 시간 후보로 합친다.
    // 인원 수가 바뀌거나, 불가자 조합이 달라지거나, 0명이 되는 지점에서 후보를 끊는다.
    private buildCandidatesForDate(
        date: dayjs.Dayjs,
        startSlotIndex: number,
        endSlotIndex: number,
        submittedCount: number,
        blockedParticipantMap: Map<string, Set<number>>,
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
        let intervalAvailabilitySignature: string | null = null;

        for (let slotIndex = startSlotIndex; slotIndex < endSlotIndex; slotIndex += 1) {
            const key = `${date.format('YYYY-MM-DD')}:${slotIndex}`;
            const blockedParticipants = blockedParticipantMap.get(key) ?? new Set<number>();
            const availableCount = submittedCount - blockedParticipants.size;
            const availabilitySignature = [...blockedParticipants].sort((a, b) => a - b).join(',');

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
                intervalAvailabilitySignature = null;
                continue;
            }

            // 새로운 연속 구간을 시작하는 첫 슬롯
            if (intervalStartIndex === null) {
                intervalStartIndex = slotIndex;
                intervalAvailableCount = availableCount;
                intervalAvailabilitySignature = availabilitySignature;
                continue;
            }

            // 같은 연속 구간 안에서도 가능한 인원 수나 가능한 참여자 조합이 바뀌면 별도 후보로 분리
            if (
                intervalAvailableCount !== availableCount ||
                intervalAvailabilitySignature !== availabilitySignature
            ) {
                this.pushTimeCandidate(
                    candidates,
                    date,
                    intervalStartIndex,
                    slotIndex,
                    intervalAvailableCount,
                );
                intervalStartIndex = slotIndex;
                intervalAvailableCount = availableCount;
                intervalAvailabilitySignature = availabilitySignature;
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
