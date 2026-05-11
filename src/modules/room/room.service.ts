import { Injectable, HttpStatus } from '@nestjs/common';
import { type PrismaService } from '../../database/prisma.service.js';
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
import { type CreateRoomRequestDto } from './dto/req/create-room.request.dto.js';
import { type CreateRoomResponseDto } from './dto/res/create-room.response.dto.js';

@Injectable()
export class RoomService {
    constructor(private readonly prisma: PrismaService) {}

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

    // 방 상세 정보 로직
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

            if (authUser && room.hostId === authUser.id) {
                viewerRole = 'HOST';
                myParticipant = room.participants.find((p) => p.userId === authUser.id) || null;
            } else {
                const found = room.participants.find(
                    (p) =>
                        (authUser && p.userId === authUser.id) ||
                        (participantUuid && p.participantUuid === participantUuid),
                );
                if (found) {
                    myParticipant = found;
                    viewerRole = 'MEMBER';
                }
            }

            // 4. 약관 동의 필요 여부
            const consentRequired = await this.checkConsentRequired(viewerRole, authUser);

            // 5. 방 상태에 따른 배지 및 문구
            const { badge, text } = this.resolveRoomDisplay(room.status, viewerRole);

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
                    slug: room.slug,
                    name: room.name,
                    description: room.description,
                    category: room.category,
                    status: room.status,
                    hostNickname: room.host.nickname,
                    badge,
                    text,
                    dateStart: TimeUtil.formatKst(room.dateStart, 'YYYY-MM-DD'),
                    dateEnd: TimeUtil.formatKst(room.dateEnd, 'YYYY-MM-DD'),
                    availableDays: room.availableDays as number[],
                    timeStart: TimeUtil.formatKst(room.timeStart, 'HH:mm'),
                    timeEnd: TimeUtil.formatKst(room.timeEnd, 'HH:mm'),
                    collectOrigin: room.collectOrigin,
                    deadlineAt: TimeUtil.formatKst(room.deadlineAt),
                },
                summary: this.calculateSummary(room.participants),
                participants: {
                    submitted: room.participants
                        .filter((p) => p.status === ParticipantStatus.SUBMITTED)
                        .map((p) => p.nickname),
                    declined: room.participants
                        .filter((p) => p.status === ParticipantStatus.DECLINED)
                        .map((p) => p.nickname),
                    joined: room.participants
                        .filter((p) => p.status === ParticipantStatus.JOINED)
                        .map((p) => p.nickname),
                },
                // 참여자 정보 (GUEST라면 null)
                mySubmission: myParticipant
                    ? {
                          nickname: myParticipant.nickname,
                          status: myParticipant.status,
                          blockedSlots: myParticipant.blockedSlots.map((s: any) => ({
                              date: TimeUtil.formatKst(s.date, 'YYYY-MM-DD'),
                              slotIndex: s.slotIndex,
                          })),
                          origin: myParticipant.origin
                              ? { address: myParticipant.origin.address }
                              : null,
                      }
                    : null,
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

    // 방 상태 및 역할에 따른 화면 표시 정보
    private resolveRoomDisplay(status: RoomStatus, role: string) {
        if (status === RoomStatus.COLLECTING) {
            return {
                badge: '진행중',
                // 방장에게는 대기 문구를, 참여자에게는 입력 문구를 보여줌
                text:
                    role === 'HOST'
                        ? '친구들의 입력을 기다리고 있어요'
                        : '지금 시간을 입력해주세요!',
            };
        }

        if (status === RoomStatus.READY) {
            return {
                badge: '수집완료',
                // 방장에게는 확정 권유를, 참여자에게는 대기 안내를 보여줌
                text:
                    role === 'HOST'
                        ? '약속 시간을 확정해주세요!'
                        : '모임장의 확정을 기다리고 있어요',
            };
        }

        if (status === RoomStatus.CONFIRMED) {
            return {
                badge: '확정',
                text: '약속이 확정되었습니다!',
            };
        }

        return {
            badge: '종료',
            text: '종료된 방입니다.',
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
}
