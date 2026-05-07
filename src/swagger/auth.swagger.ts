import { ApiInternalServerErrorResponse, ApiNotFoundResponse } from '@nestjs/swagger';
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
