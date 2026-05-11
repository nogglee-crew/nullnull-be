import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { type User as SupabaseUser } from '@supabase/supabase-js';
import { ErrorCode } from '../../common/exception/error-codes.js';
import { AppException } from '../../common/exception/app.exception.js';
import { type User } from '../../generated/prisma/client.js';
import {
    ParticipantRole,
    ParticipantStatus,
    PolicyType,
    RoomStatus,
} from '../../generated/prisma/enums.js';
import { TimeUtil } from '../../common/utils/time.util.js';
import { type JoinParticipantRequestDto } from './dto/req/join-participant.request.dto.js';
import { type SubmitParticipationRequestDto } from './dto/req/submit-participation.request.dto.js';
import { type JoinParticipantResponseDto } from './dto/res/join-participant.response.dto.js';
import { ParticipantStatusResponseDto } from './dto/res/submit-participation.response.dto.js';
import { ParticipantsRepository } from './participants.repository.js';
import { AuthRepository } from '../auth/auth.repository.js';

const ROOM_PARTICIPANT_COOKIE_PREFIX = 'participant_uuid_';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type JoinParticipantResult = {
    data: JoinParticipantResponseDto;
    issuedParticipantUuid: string | null;
    roomSlug: string | null;
};

@Injectable()
export class ParticipantsService {
    constructor(
        private readonly participantsRepository: ParticipantsRepository,
        private readonly authRepository: AuthRepository,
    ) {}

    // 회원/비회원 참여를 분기해 consent 저장과 participant 생성을 하나의 트랜잭션으로 처리한다.
    async joinRoom(
        roomIdParam: string,
        body: JoinParticipantRequestDto,
        authUser: SupabaseUser | undefined,
        cookieHeader: string | undefined,
    ): Promise<JoinParticipantResult> {
        const roomId = this.parseRoomId(roomIdParam);
        const nickname = this.validateNickname(body.nickname);

        try {
            return await this.participantsRepository.withTransaction(async (tx) => {
                const room = await this.participantsRepository.findRoomForJoin(tx, roomId);

                // 참여 대상 방이 실제로 존재하는지 먼저 확인한다.
                if (!room) {
                    throw new AppException(
                        HttpStatus.NOT_FOUND,
                        '존재하지 않는 방입니다.',
                        ErrorCode.ROOM_NOT_FOUND,
                    );
                }

                // 참여는 수집 중인 방에서만 허용한다.
                if (room.status !== RoomStatus.COLLECTING) {
                    throw new AppException(
                        HttpStatus.CONFLICT,
                        '현재 참여할 수 없는 방입니다.',
                        ErrorCode.INVALID_ROOM_STATUS,
                    );
                }

                const latestPolicies = await this.getLatestPolicies(tx);
                if (!latestPolicies) {
                    throw new AppException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        '참여자 등록 중 오류가 발생했습니다.',
                        ErrorCode.INTERNAL_SERVER_ERROR,
                    );
                }

                // 회원은 user_id 기준으로 중복 참여를 막고, 최신 동의 이력이 없으면 먼저 저장한다.
                if (authUser) {
                    const user = await this.findOrCreateUser(tx, authUser.id, nickname);

                    const existingParticipant =
                        await this.participantsRepository.findParticipantByUserId(
                            tx,
                            room.roomId,
                            user.userId,
                        );

                    if (existingParticipant) {
                        throw new AppException(
                            HttpStatus.CONFLICT,
                            '이미 참여 중인 방입니다.',
                            ErrorCode.ALREADY_PARTICIPATED,
                        );
                    }

                    const role =
                        room.hostId === user.userId ? ParticipantRole.HOST : ParticipantRole.MEMBER;

                    const existingConsent = await this.authRepository.findConsent(
                        tx,
                        user.userId,
                        latestPolicies.terms.policyVersionId,
                        latestPolicies.privacy.policyVersionId,
                    );

                    const agreedAt = existingConsent?.agreedAt ?? new Date();

                    if (!existingConsent) {
                        await this.authRepository.createConsent(
                            tx,
                            user.userId,
                            latestPolicies.terms.policyVersionId,
                            latestPolicies.privacy.policyVersionId,
                            agreedAt,
                        );
                    }

                    const participant = await this.participantsRepository.createParticipant(tx, {
                        roomId: room.roomId,
                        userId: user.userId,
                        nickname,
                        role,
                        termsVersionId: latestPolicies.terms.policyVersionId,
                        privacyVersionId: latestPolicies.privacy.policyVersionId,
                        agreedAt,
                    });

                    return {
                        data: { participantId: Number(participant.participantId) },
                        issuedParticipantUuid: null,
                        roomSlug: null,
                    };
                }

                // 비회원은 현재 방 slug에 해당하는 participant UUID만 쿠키에서 찾아 재참여 여부를 확인한다.
                const participantUuid = this.extractParticipantUuid(cookieHeader, room.slug);

                if (participantUuid) {
                    const existingParticipant =
                        await this.participantsRepository.findParticipantByUuid(
                            tx,
                            room.roomId,
                            participantUuid,
                        );

                    if (existingParticipant) {
                        throw new AppException(
                            HttpStatus.CONFLICT,
                            '이미 참여 중인 방입니다.',
                            ErrorCode.ALREADY_PARTICIPATED,
                        );
                    }
                }

                // 신규 비회원 참여자는 새 participant UUID를 발급하고, 그 값을 쿠키로 내려준다.
                const agreedAt = new Date();
                const issuedParticipantUuid = randomUUID();
                const participant = await this.participantsRepository.createParticipant(tx, {
                    roomId: room.roomId,
                    participantUuid: issuedParticipantUuid,
                    nickname,
                    role: ParticipantRole.MEMBER,
                    termsVersionId: latestPolicies.terms.policyVersionId,
                    privacyVersionId: latestPolicies.privacy.policyVersionId,
                    agreedAt,
                });

                return {
                    data: { participantId: Number(participant.participantId) },
                    issuedParticipantUuid: participant.participantUuid,
                    roomSlug: room.slug,
                };
            });
        } catch (error) {
            if (error instanceof AppException) throw error;
            throw new AppException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                '참여자 등록 중 오류가 발생했습니다.',
                ErrorCode.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // 참여자의 제출 권한을 확인한 뒤 불가능 시간과 출발지를 저장하고 참여 상태를 SUBMITTED로 변경한다.
    async submitParticipation(
        participantIdParam: string,
        body: SubmitParticipationRequestDto,
        authUser: SupabaseUser | undefined,
        cookieHeader: string | undefined,
    ): Promise<ParticipantStatusResponseDto> {
        const participantId = this.parseParticipantId(participantIdParam);
        const blockedSlots = this.normalizeBlockedSlots(body);

        try {
            return await this.participantsRepository.withTransaction(async (tx) => {
                const participant =
                    await this.participantsRepository.findParticipantForParticipation(
                        tx,
                        participantId,
                    );

                if (!participant) {
                    throw new AppException(
                        HttpStatus.NOT_FOUND,
                        '존재하지 않는 참여자입니다.',
                        ErrorCode.PARTICIPANT_NOT_FOUND,
                    );
                }

                if (participant.room.status !== RoomStatus.COLLECTING) {
                    throw new AppException(
                        HttpStatus.CONFLICT,
                        '참여 정보를 제출할 수 없는 방 상태입니다.',
                        ErrorCode.INVALID_ROOM_STATUS,
                    );
                }

                if (!this.canEditParticipation(participant, authUser, cookieHeader)) {
                    throw new AppException(
                        HttpStatus.FORBIDDEN,
                        '수정 권한이 없습니다.',
                        ErrorCode.FORBIDDEN,
                    );
                }

                if (participant.room.collectOrigin && !body.origin) {
                    throw new AppException(
                        HttpStatus.BAD_REQUEST,
                        '유효하지 않은 요청입니다.',
                        ErrorCode.INVALID_REQUEST,
                    );
                }

                if (body.origin) {
                    await this.participantsRepository.upsertOrigin(tx, participant.participantId, {
                        address: body.origin.address,
                        lat: body.origin.lat,
                        lng: body.origin.lng,
                    });
                }

                // 제출값은 전체 교체 기준으로 저장하고, 성공 시 참여 상태를 SUBMITTED로 올린다.
                await this.participantsRepository.replaceBlockedSlots(
                    tx,
                    participant.participantId,
                    blockedSlots,
                );
                await this.participantsRepository.updateParticipantStatus(
                    tx,
                    participant.participantId,
                    ParticipantStatus.SUBMITTED,
                );

                return { participantStatus: ParticipantStatus.SUBMITTED };
            });
        } catch (error) {
            if (error instanceof AppException) throw error;
            throw new AppException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                '참여 정보 저장 중 오류가 발생했습니다.',
                ErrorCode.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // 참여자 본인 여부를 확인한 뒤 제출 정보를 삭제하고 참여 상태를 DECLINED로 변경한다.
    async declineParticipant(
        participantIdParam: string,
        authUser: SupabaseUser | undefined,
        cookieHeader: string | undefined,
    ): Promise<ParticipantStatusResponseDto> {
        const participantId = this.parseParticipantId(participantIdParam);

        try {
            return await this.participantsRepository.withTransaction(async (tx) => {
                const participant =
                    await this.participantsRepository.findParticipantForParticipation(
                        tx,
                        participantId,
                    );

                if (!participant) {
                    throw new AppException(
                        HttpStatus.NOT_FOUND,
                        '존재하지 않는 참여자입니다.',
                        ErrorCode.PARTICIPANT_NOT_FOUND,
                    );
                }

                if (participant.room.status !== RoomStatus.COLLECTING) {
                    throw new AppException(
                        HttpStatus.CONFLICT,
                        '불참 처리할 수 없는 방 상태입니다.',
                        ErrorCode.INVALID_ROOM_STATUS,
                    );
                }

                if (!this.canEditParticipation(participant, authUser, cookieHeader)) {
                    throw new AppException(
                        HttpStatus.FORBIDDEN,
                        '처리 권한이 없습니다.',
                        ErrorCode.FORBIDDEN,
                    );
                }

                await this.participantsRepository.clearParticipationData(
                    tx,
                    participant.participantId,
                );
                await this.participantsRepository.updateParticipantStatus(
                    tx,
                    participant.participantId,
                    ParticipantStatus.DECLINED,
                );

                return { participantStatus: ParticipantStatus.DECLINED };
            });
        } catch (error) {
            if (error instanceof AppException) throw error;
            throw new AppException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                '불참 처리 중 오류가 발생했습니다.',
                ErrorCode.INTERNAL_SERVER_ERROR,
            );
        }
    }

    private parseRoomId(roomIdParam: string): bigint {
        if (!/^\d+$/.test(roomIdParam)) {
            throw new AppException(
                HttpStatus.BAD_REQUEST,
                '유효하지 않은 방 요청입니다.',
                ErrorCode.INVALID_ROOM_REQUEST,
            );
        }
        return BigInt(roomIdParam);
    }

    private parseParticipantId(participantIdParam: string): bigint {
        if (!/^\d+$/.test(participantIdParam)) {
            throw new AppException(
                HttpStatus.BAD_REQUEST,
                '유효하지 않은 요청입니다.',
                ErrorCode.INVALID_REQUEST,
            );
        }
        return BigInt(participantIdParam);
    }

    // 닉네임은 trim 이후 2~10자만 허용한다.
    private validateNickname(rawNickname: string): string {
        const nickname = rawNickname.trim();

        if (!nickname || nickname.length < 2 || nickname.length > 10) {
            throw new AppException(
                HttpStatus.BAD_REQUEST,
                '닉네임은 2자 이상 10자 이하로 입력해주세요.',
                ErrorCode.INVALID_NICKNAME,
            );
        }

        return nickname;
    }

    // 요청은 날짜별 슬롯 배열로 받고, 저장은 한 슬롯당 한 row로 펼친다.
    private normalizeBlockedSlots(body: SubmitParticipationRequestDto) {
        const blockedSlots = body.blockedSlots ?? [];
        return blockedSlots.flatMap((blockedSlot) =>
            blockedSlot.slotIndexes.map((slotIndex) => ({
                date: TimeUtil.toUtcDateOnly(blockedSlot.date),
                slotIndex,
            })),
        );
    }

    // 참여 시점의 최신 필수 약관 조합을 조회한다.
    private async getLatestPolicies(tx: Parameters<AuthRepository['findLatestPolicies']>[0]) {
        const latestPolicies = await this.authRepository.findLatestPolicies(tx);

        const terms = latestPolicies.find((p) => p.policyType === PolicyType.TERMS);
        const privacy = latestPolicies.find((p) => p.policyType === PolicyType.PRIVACY);

        if (!terms || !privacy) return null;

        return { terms, privacy };
    }

    // 회원 참여 시에는 서비스 user를 만들거나 닉네임만 최신 값으로 동기화한다.
    private async findOrCreateUser(
        tx: Parameters<ParticipantsRepository['updateUserNickname']>[0],
        userId: string,
        nickname: string,
    ): Promise<User> {
        const existingUser = await this.authRepository.findUserById(tx, userId);

        if (!existingUser) {
            return this.authRepository.createUser(tx, userId, nickname);
        }

        if (existingUser.nickname !== nickname) {
            return this.participantsRepository.updateUserNickname(tx, userId, nickname);
        }

        return existingUser;
    }

    // 현재 방 slug에 해당하는 비회원 participant UUID만 쿠키에서 꺼낸다.
    private extractParticipantUuid(
        cookieHeader: string | undefined,
        roomSlug: string,
    ): string | null {
        if (!cookieHeader) return null;

        const targetKey = `${ROOM_PARTICIPANT_COOKIE_PREFIX}${roomSlug}`;

        for (const entry of cookieHeader.split(';').map((v) => v.trim())) {
            const separatorIndex = entry.indexOf('=');
            if (separatorIndex === -1) continue;

            const key = entry.slice(0, separatorIndex);
            const value = decodeURIComponent(entry.slice(separatorIndex + 1));
            if (key === targetKey && UUID_PATTERN.test(value)) return value;
        }

        return null;
    }

    // 참여자 본인 여부를 확인한다.
    private canEditParticipation(
        participant: {
            userId: string | null;
            participantUuid: string | null;
            room: { slug: string; collectOrigin: boolean };
        },
        authUser: SupabaseUser | undefined,
        cookieHeader: string | undefined,
    ): boolean {
        if (authUser) return participant.userId === authUser.id;
        if (!participant.participantUuid) return false;

        const participantUuid = this.extractParticipantUuid(cookieHeader, participant.room.slug);
        return participantUuid === participant.participantUuid;
    }
}
