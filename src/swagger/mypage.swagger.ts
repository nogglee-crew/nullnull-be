import {
    ApiBadRequestResponse,
    ApiInternalServerErrorResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

export const UPDATE_ME_SUCCESS = {
    statusCode: 200,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/me',
    message: '내 정보가 수정되었습니다.',
    data: {
        user: {
            id: 'd792695a-...',
            nickname: '노글리',
        },
    },
    error: null,
};

export const UPDATE_ME_INVALID_NICKNAME = {
    statusCode: 400,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/me',
    message: '닉네임은 2자 이상 10자 이하로 입력해주세요.',
    data: null,
    error: 'INVALID_NICKNAME',
};

export const UPDATE_ME_UNAUTHORIZED = {
    statusCode: 401,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/me',
    message: '로그인이 필요합니다.',
    data: null,
    error: 'UNAUTHORIZED',
};

export const UPDATE_ME_USER_NOT_FOUND = {
    statusCode: 404,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/me',
    message: '존재하지 않는 사용자입니다.',
    data: null,
    error: 'USER_NOT_FOUND',
};

export const UPDATE_ME_INTERNAL_SERVER_ERROR = {
    statusCode: 500,
    timestamp: '2026-04-28T00:00:00.000Z',
    path: '/me',
    message: '내 정보 수정 중 오류가 발생했습니다.',
    data: null,
    error: 'INTERNAL_SERVER_ERROR',
};

/**
 * 내 정보 수정 성공 응답 데코레이터
 */
export function ApiUpdateMeSuccessResponse() {
    return ApiOkResponse({
        schema: {
            example: UPDATE_ME_SUCCESS,
        },
    });
}

export function ApiUpdateMeErrorResponses() {
    return applyDecorators(
        ApiBadRequestResponse({
            description: '닉네임 유효성 검사 실패',
            schema: { example: UPDATE_ME_INVALID_NICKNAME },
        }),
        ApiUnauthorizedResponse({
            description: '로그인 필요',
            schema: { example: UPDATE_ME_UNAUTHORIZED },
        }),
        ApiNotFoundResponse({
            description: '존재하지 않는 사용자',
            schema: { example: UPDATE_ME_USER_NOT_FOUND },
        }),
        ApiInternalServerErrorResponse({
            description: '서버 오류',
            schema: { example: UPDATE_ME_INTERNAL_SERVER_ERROR },
        }),
    );
}
