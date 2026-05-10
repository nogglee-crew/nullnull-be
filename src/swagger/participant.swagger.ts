import {
    ApiBadRequestResponse,
    ApiConflictResponse,
    ApiForbiddenResponse,
    ApiInternalServerErrorResponse,
    ApiNotFoundResponse,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

export const PARTICIPANT_JOIN_INVALID_REQUEST = {
    statusCode: 400,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/rooms/1/participants',
    message: '유효하지 않은 방 요청입니다.',
    data: null,
    error: 'INVALID_ROOM_REQUEST',
};

export const PARTICIPANT_JOIN_INVALID_NICKNAME = {
    statusCode: 400,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/rooms/1/participants',
    message: '닉네임은 2자 이상 10자 이하로 입력해주세요.',
    data: null,
    error: 'INVALID_NICKNAME',
};

export const PARTICIPANT_JOIN_MISSING_NICKNAME = {
    statusCode: 400,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/rooms/1/participants',
    message: '모임에 참여하기 위해 닉네임을 입력해 주세요.',
    data: null,
    error: 'BAD_REQUEST',
};

export const PARTICIPANT_JOIN_ROOM_NOT_FOUND = {
    statusCode: 404,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/rooms/1/participants',
    message: '존재하지 않는 방입니다.',
    data: null,
    error: 'ROOM_NOT_FOUND',
};

export const PARTICIPANT_JOIN_ALREADY_PARTICIPATED = {
    statusCode: 409,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/rooms/1/participants',
    message: '이미 참여 중인 방입니다.',
    data: null,
    error: 'ALREADY_PARTICIPATED',
};

export const PARTICIPANT_JOIN_INVALID_ROOM_STATUS = {
    statusCode: 409,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/rooms/1/participants',
    message: '현재 참여할 수 없는 방입니다.',
    data: null,
    error: 'INVALID_ROOM_STATUS',
};

export const PARTICIPANT_JOIN_INTERNAL_SERVER_ERROR = {
    statusCode: 500,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/rooms/1/participants',
    message: '참여자 등록 중 오류가 발생했습니다.',
    data: null,
    error: 'INTERNAL_SERVER_ERROR',
};

export function ApiJoinParticipantErrorResponses() {
    return applyDecorators(
        ApiBadRequestResponse({
            description: '유효하지 않은 방 요청 또는 닉네임',
            schema: {
                oneOf: [
                    { example: PARTICIPANT_JOIN_INVALID_REQUEST },
                    { example: PARTICIPANT_JOIN_MISSING_NICKNAME },
                    { example: PARTICIPANT_JOIN_INVALID_NICKNAME },
                ],
            },
        }),
        ApiNotFoundResponse({
            description: '존재하지 않는 방',
            schema: { example: PARTICIPANT_JOIN_ROOM_NOT_FOUND },
        }),
        ApiConflictResponse({
            description: '이미 참여 중인 방 또는 참여 불가 상태',
            schema: {
                oneOf: [
                    { example: PARTICIPANT_JOIN_ALREADY_PARTICIPATED },
                    { example: PARTICIPANT_JOIN_INVALID_ROOM_STATUS },
                ],
            },
        }),
        ApiInternalServerErrorResponse({
            description: '서버 오류',
            schema: { example: PARTICIPANT_JOIN_INTERNAL_SERVER_ERROR },
        }),
    );
}

export const PARTICIPANT_SUBMIT_INVALID_REQUEST = {
    statusCode: 400,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/participants/1/participation',
    message: '유효하지 않은 요청입니다.',
    data: null,
    error: 'BAD_REQUEST',
};

export const PARTICIPANT_SUBMIT_FORBIDDEN = {
    statusCode: 403,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/participants/1/participation',
    message: '수정 권한이 없습니다.',
    data: null,
    error: 'FORBIDDEN',
};

export const PARTICIPANT_SUBMIT_NOT_FOUND = {
    statusCode: 404,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/participants/1/participation',
    message: '존재하지 않는 참여자입니다.',
    data: null,
    error: 'PARTICIPANT_NOT_FOUND',
};

export const PARTICIPANT_SUBMIT_INVALID_ROOM_STATUS = {
    statusCode: 409,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/participants/1/participation',
    message: '참여 정보를 제출할 수 없는 방 상태입니다.',
    data: null,
    error: 'INVALID_ROOM_STATUS',
};

export const PARTICIPANT_SUBMIT_INTERNAL_SERVER_ERROR = {
    statusCode: 500,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/participants/1/participation',
    message: '참여 정보 저장 중 오류가 발생했습니다.',
    data: null,
    error: 'INTERNAL_SERVER_ERROR',
};

export function ApiSubmitParticipationErrorResponses() {
    return applyDecorators(
        ApiBadRequestResponse({
            description: '유효하지 않은 요청',
            schema: { example: PARTICIPANT_SUBMIT_INVALID_REQUEST },
        }),
        ApiForbiddenResponse({
            description: '수정 권한 없음',
            schema: { example: PARTICIPANT_SUBMIT_FORBIDDEN },
        }),
        ApiNotFoundResponse({
            description: '존재하지 않는 참여자',
            schema: { example: PARTICIPANT_SUBMIT_NOT_FOUND },
        }),
        ApiConflictResponse({
            description: '참여 정보를 제출할 수 없는 방 상태',
            schema: { example: PARTICIPANT_SUBMIT_INVALID_ROOM_STATUS },
        }),
        ApiInternalServerErrorResponse({
            description: '서버 오류',
            schema: { example: PARTICIPANT_SUBMIT_INTERNAL_SERVER_ERROR },
        }),
    );
}

export const PARTICIPANT_DECLINE_FORBIDDEN = {
    statusCode: 403,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/participants/1/decline',
    message: '처리 권한이 없습니다.',
    data: null,
    error: 'FORBIDDEN',
};

export const PARTICIPANT_DECLINE_NOT_FOUND = {
    statusCode: 404,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/participants/1/decline',
    message: '존재하지 않는 참여자입니다.',
    data: null,
    error: 'PARTICIPANT_NOT_FOUND',
};

export const PARTICIPANT_DECLINE_INVALID_ROOM_STATUS = {
    statusCode: 409,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/participants/1/decline',
    message: '불참 처리할 수 없는 방 상태입니다.',
    data: null,
    error: 'INVALID_ROOM_STATUS',
};

export const PARTICIPANT_DECLINE_INTERNAL_SERVER_ERROR = {
    statusCode: 500,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/participants/1/decline',
    message: '불참 처리 중 오류가 발생했습니다.',
    data: null,
    error: 'INTERNAL_SERVER_ERROR',
};

export function ApiDeclineParticipantErrorResponses() {
    return applyDecorators(
        ApiForbiddenResponse({
            description: '처리 권한 없음',
            schema: { example: PARTICIPANT_DECLINE_FORBIDDEN },
        }),
        ApiNotFoundResponse({
            description: '존재하지 않는 참여자',
            schema: { example: PARTICIPANT_DECLINE_NOT_FOUND },
        }),
        ApiConflictResponse({
            description: '불참 처리할 수 없는 방 상태',
            schema: { example: PARTICIPANT_DECLINE_INVALID_ROOM_STATUS },
        }),
        ApiInternalServerErrorResponse({
            description: '서버 오류',
            schema: { example: PARTICIPANT_DECLINE_INTERNAL_SERVER_ERROR },
        }),
    );
}
