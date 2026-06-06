import {
    ApiConflictResponse,
    ApiInternalServerErrorResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

export const AUTH_SYNC_INTERNAL_SERVER_ERROR = {
    statusCode: 500,
    timestamp: '2026-03-18T06:51:15.442Z',
    path: '/auth/sync',
    message: '사용자 동기화 중 오류가 발생했습니다.',
    data: null,
    error: 'INTERNAL_SERVER_ERROR',
};

export function ApiAuthSyncErrorResponses() {
    return applyDecorators(
        ApiInternalServerErrorResponse({
            description: '서버 오류',
            schema: { example: AUTH_SYNC_INTERNAL_SERVER_ERROR },
        }),
    );
}

export const AUTH_CONSENT_POLICY_NOT_FOUND = {
    statusCode: 404,
    timestamp: '2026-05-02T00:00:00.000Z',
    path: '/auth/consent',
    message: '최신 약관 정보를 찾을 수 없습니다.',
    data: null,
    error: 'POLICY_VERSION_NOT_FOUND',
};

export const AUTH_CONSENT_INTERNAL_SERVER_ERROR = {
    statusCode: 500,
    timestamp: '2026-05-02T00:00:00.000Z',
    path: '/auth/consent',
    message: '약관 동의 처리 중 오류가 발생했습니다.',
    data: null,
    error: 'INTERNAL_SERVER_ERROR',
};

export function ApiAuthConsentErrorResponses() {
    return applyDecorators(
        ApiNotFoundResponse({
            description: '최신 약관 정보 없음',
            schema: { example: AUTH_CONSENT_POLICY_NOT_FOUND },
        }),
        ApiInternalServerErrorResponse({
            description: '서버 오류',
            schema: { example: AUTH_CONSENT_INTERNAL_SERVER_ERROR },
        }),
    );
}

export const ACCOUNT_WITHDRAWAL_SUCCESS = {
    statusCode: 200,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/me',
    message: '회원 탈퇴가 완료되었습니다.',
    data: null,
    error: null,
};

export const ACCOUNT_WITHDRAWAL_USER_NOT_FOUND = {
    statusCode: 404,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/me',
    message: '존재하지 않는 사용자입니다.',
    data: null,
    error: 'USER_NOT_FOUND',
};

export const ACCOUNT_WITHDRAWAL_UNAUTHORIZED = {
    statusCode: 401,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/me',
    message: '로그인이 필요합니다.',
    data: null,
    error: 'UNAUTHORIZED',
};

export const ACCOUNT_WITHDRAWAL_ACTIVE_ROOM_EXISTS = {
    statusCode: 409,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/me',
    message: '모집중인 모임이 있어 탈퇴할 수 없습니다. 먼저 종료해 주세요.',
    data: null,
    error: 'ACTIVE_ROOM_EXISTS',
};

export const ACCOUNT_WITHDRAWAL_INTERNAL_SERVER_ERROR = {
    statusCode: 500,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/me',
    message: '회원 탈퇴 처리 중 오류가 발생했습니다.',
    data: null,
    error: 'INTERNAL_SERVER_ERROR',
};

export function ApiAccountWithdrawalSuccessResponse() {
    return ApiOkResponse({
        schema: {
            example: ACCOUNT_WITHDRAWAL_SUCCESS,
        },
    });
}

export function ApiAccountWithdrawalErrorResponses() {
    return applyDecorators(
        ApiUnauthorizedResponse({
            description: '로그인 필요',
            schema: { example: ACCOUNT_WITHDRAWAL_UNAUTHORIZED },
        }),
        ApiNotFoundResponse({
            description: '존재하지 않는 사용자',
            schema: { example: ACCOUNT_WITHDRAWAL_USER_NOT_FOUND },
        }),
        ApiConflictResponse({
            description: '모집중인 방이 있어 탈퇴 불가',
            schema: { example: ACCOUNT_WITHDRAWAL_ACTIVE_ROOM_EXISTS },
        }),
        ApiInternalServerErrorResponse({
            description: '서버 오류',
            schema: { example: ACCOUNT_WITHDRAWAL_INTERNAL_SERVER_ERROR },
        }),
    );
}
