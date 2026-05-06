import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiExtraModels,
    ApiInternalServerErrorResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiUnauthorizedResponse,
    getSchemaPath,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';
import { AuthConsentResponseDto } from '../modules/auth/dto/res/auth-consent.response.dto.js';
import { AuthSyncResponseDto } from '../modules/auth/dto/res/auth-sync.response.dto.js';
import { ErrorResponseDto } from '../common/dto/response.dto.js';

export const AUTH_SYNC_BAD_REQUEST_EXAMPLE = {
    statusCode: 400,
    timestamp: '2026-03-18T06:51:10.317Z',
    path: '/auth/sync',
    message: '유효하지 않은 요청입니다.',
    data: null,
    error: 'INVALID_REQUEST',
};

export const AUTH_SYNC_UNAUTHORIZED_EXAMPLE = {
    statusCode: 401,
    timestamp: '2026-03-18T06:51:12.102Z',
    path: '/auth/sync',
    message: '인증 정보가 유효하지 않습니다.',
    data: null,
    error: 'UNAUTHORIZED',
};

export const AUTH_SYNC_INTERNAL_SERVER_ERROR_EXAMPLE = {
    statusCode: 500,
    timestamp: '2026-03-18T06:51:15.442Z',
    path: '/auth/sync',
    message: '사용자 동기화 중 오류가 발생했습니다.',
    data: null,
    error: 'INTERNAL_SERVER_ERROR',
};

export const AUTH_CONSENT_OK_EXAMPLE = {
    statusCode: 200,
    timestamp: '2026-05-02T00:00:00.000Z',
    path: '/auth/consent',
    message: '약관 동의가 완료되었습니다.',
    data: {
        consentRequired: false,
    },
    error: null,
};

export const AUTH_CONSENT_UNAUTHORIZED_EXAMPLE = {
    statusCode: 401,
    timestamp: '2026-05-02T00:00:00.000Z',
    path: '/auth/consent',
    message: '인증 정보가 유효하지 않습니다.',
    data: null,
    error: 'UNAUTHORIZED',
};

export const AUTH_CONSENT_POLICY_NOT_FOUND_EXAMPLE = {
    statusCode: 404,
    timestamp: '2026-05-02T00:00:00.000Z',
    path: '/auth/consent',
    message: '최신 약관 정보를 찾을 수 없습니다.',
    data: null,
    error: 'POLICY_VERSION_NOT_FOUND',
};

export const AUTH_CONSENT_INTERNAL_SERVER_ERROR_EXAMPLE = {
    statusCode: 500,
    timestamp: '2026-05-02T00:00:00.000Z',
    path: '/auth/consent',
    message: '약관 동의 처리 중 오류가 발생했습니다.',
    data: null,
    error: 'INTERNAL_SERVER_ERROR',
};

function responseSchema<TModel extends new (...args: never[]) => object>(
    model: TModel,
    example: object,
) {
    return {
        allOf: [{ $ref: getSchemaPath(model) }],
        example,
    };
}

export function ApiAuthSync() {
    return applyDecorators(
        ApiExtraModels(AuthSyncResponseDto, ErrorResponseDto),

        ApiBadRequestResponse({
            description: '유효하지 않은 요청',
            schema: responseSchema(ErrorResponseDto, AUTH_SYNC_BAD_REQUEST_EXAMPLE),
        }),
        ApiUnauthorizedResponse({
            description: '유효하지 않은 인증 정보',
            schema: responseSchema(ErrorResponseDto, AUTH_SYNC_UNAUTHORIZED_EXAMPLE),
        }),
        ApiInternalServerErrorResponse({
            description: '서버 오류',
            schema: responseSchema(ErrorResponseDto, AUTH_SYNC_INTERNAL_SERVER_ERROR_EXAMPLE),
        }),
    );
}

export function ApiAuthConsent() {
    return applyDecorators(
        ApiOperation({ summary: '약관 동의' }),
        ApiBearerAuth(),
        ApiExtraModels(AuthConsentResponseDto, ErrorResponseDto),
        ApiOkResponse({
            description: '약관 동의 성공',
            schema: responseSchema(AuthConsentResponseDto, AUTH_CONSENT_OK_EXAMPLE),
        }),
        ApiUnauthorizedResponse({
            description: '유효하지 않은 인증 정보',
            schema: responseSchema(ErrorResponseDto, AUTH_CONSENT_UNAUTHORIZED_EXAMPLE),
        }),
        ApiNotFoundResponse({
            description: '최신 약관 정보 없음',
            schema: responseSchema(ErrorResponseDto, AUTH_CONSENT_POLICY_NOT_FOUND_EXAMPLE),
        }),
        ApiInternalServerErrorResponse({
            description: '서버 오류',
            schema: responseSchema(ErrorResponseDto, AUTH_CONSENT_INTERNAL_SERVER_ERROR_EXAMPLE),
        }),
    );
}
