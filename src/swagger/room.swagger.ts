import { applyDecorators } from '@nestjs/common';
import {
    ApiConflictResponse,
    ApiForbiddenResponse,
    ApiInternalServerErrorResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiUnauthorizedResponse,
    ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

// DTO data가 null이라 이곳에서 명시
export const ROOM_READY_SUCCESS = {
    statusCode: 200,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/rooms/1/ready',
    message: '방이 마감되었습니다.',
    data: null,
    error: null,
};

export const ROOM_READY_UNAUTHORIZED = {
    statusCode: 401,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/rooms/1/ready',
    message: '로그인이 필요합니다.',
    data: null,
    error: 'UNAUTHORIZED',
};

export const ROOM_READY_FORBIDDEN = {
    statusCode: 403,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/rooms/1/ready',
    message: '방 마감 권한이 없습니다.',
    data: null,
    error: 'FORBIDDEN',
};

export const ROOM_READY_NOT_FOUND = {
    statusCode: 404,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/rooms/1/ready',
    message: '존재하지 않는 방입니다.',
    data: null,
    error: 'ROOM_NOT_FOUND',
};

export const ROOM_READY_INVALID_STATUS = {
    statusCode: 409,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/rooms/1/ready',
    message: '마감할 수 없는 방 상태입니다.',
    data: null,
    error: 'INVALID_ROOM_STATUS',
};

export const ROOM_READY_NO_SUBMITTED_PARTICIPANTS = {
    statusCode: 422,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/rooms/1/ready',
    message: '후보를 생성할 수 있는 제출 데이터가 없습니다.',
    data: null,
    error: 'NO_SUBMITTED_PARTICIPANTS',
};

export const ROOM_READY_INTERNAL_SERVER_ERROR = {
    statusCode: 500,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/rooms/1/ready',
    message: '방 마감 중 오류가 발생했습니다.',
    data: null,
    error: 'INTERNAL_SERVER_ERROR',
};

export const ROOM_READY_EXTERNAL_API_ERROR = {
    statusCode: 500,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/rooms/1/ready',
    message: '외부 서비스 호출 중 오류가 발생했습니다.',
    data: null,
    error: 'EXTERNAL_API_ERROR',
};

export function ApiReadyRoomSuccessResponse() {
    return ApiOkResponse({
        schema: {
            example: ROOM_READY_SUCCESS,
        },
    });
}

export function ApiReadyRoomErrorResponses() {
    return applyDecorators(
        ApiUnauthorizedResponse({
            description: '로그인 필요',
            schema: { example: ROOM_READY_UNAUTHORIZED },
        }),
        ApiForbiddenResponse({
            description: '방 마감 권한 없음',
            schema: { example: ROOM_READY_FORBIDDEN },
        }),
        ApiNotFoundResponse({
            description: '존재하지 않는 방',
            schema: { example: ROOM_READY_NOT_FOUND },
        }),
        ApiConflictResponse({
            description: '마감할 수 없는 방 상태',
            schema: { example: ROOM_READY_INVALID_STATUS },
        }),
        ApiUnprocessableEntityResponse({
            description: '후보 생성 가능한 제출 데이터 없음',
            schema: { example: ROOM_READY_NO_SUBMITTED_PARTICIPANTS },
        }),
        ApiInternalServerErrorResponse({
            description: '서버 오류',
            schema: {
                oneOf: [
                    { example: ROOM_READY_EXTERNAL_API_ERROR },
                    { example: ROOM_READY_INTERNAL_SERVER_ERROR },
                ],
            },
        }),
    );
}

export const ROOM_CANDIDATES_UNAUTHORIZED = {
    statusCode: 401,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/rooms/1/candidates',
    message: '로그인이 필요합니다.',
    data: null,
    error: 'UNAUTHORIZED',
};

export const ROOM_CANDIDATES_FORBIDDEN = {
    statusCode: 403,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/rooms/1/candidates',
    message: '후보 조회 권한이 없습니다.',
    data: null,
    error: 'FORBIDDEN',
};

export const ROOM_CANDIDATES_NOT_FOUND = {
    statusCode: 404,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/rooms/1/candidates',
    message: '존재하지 않는 방입니다.',
    data: null,
    error: 'ROOM_NOT_FOUND',
};

export const ROOM_CANDIDATES_INVALID_STATUS = {
    statusCode: 409,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/rooms/1/candidates',
    message: '후보를 조회할 수 없는 방 상태입니다.',
    data: null,
    error: 'INVALID_ROOM_STATUS',
};

export const ROOM_CANDIDATES_INTERNAL_SERVER_ERROR = {
    statusCode: 500,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/rooms/1/candidates',
    message: '확정 후보 조회 중 오류가 발생했습니다.',
    data: null,
    error: 'INTERNAL_SERVER_ERROR',
};

export function ApiReadRoomCandidatesErrorResponses() {
    return applyDecorators(
        ApiUnauthorizedResponse({
            description: '로그인 필요',
            schema: { example: ROOM_CANDIDATES_UNAUTHORIZED },
        }),
        ApiForbiddenResponse({
            description: '후보 조회 권한 없음',
            schema: { example: ROOM_CANDIDATES_FORBIDDEN },
        }),
        ApiNotFoundResponse({
            description: '존재하지 않는 방',
            schema: { example: ROOM_CANDIDATES_NOT_FOUND },
        }),
        ApiConflictResponse({
            description: '후보를 조회할 수 없는 방 상태',
            schema: { example: ROOM_CANDIDATES_INVALID_STATUS },
        }),
        ApiInternalServerErrorResponse({
            description: '서버 오류',
            schema: { example: ROOM_CANDIDATES_INTERNAL_SERVER_ERROR },
        }),
    );
}
