import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../../common/error-codes.js';
import { AppException } from '../../common/app.exception.js';

export class InvalidAuthSyncRequestError extends AppException {
    constructor(
        message = '유효하지 않은 요청입니다.',
        error: ErrorCode = ErrorCode.INVALID_REQUEST,
    ) {
        super(HttpStatus.BAD_REQUEST, message, error);
    }
}

export class InvalidAuthTokenError extends AppException {
    constructor(
        message = '인증 정보가 유효하지 않습니다.',
        error: ErrorCode = ErrorCode.UNAUTHORIZED,
    ) {
        super(HttpStatus.UNAUTHORIZED, message, error);
    }
}

export class AuthSyncInternalServerError extends AppException {
    constructor(
        message = '사용자 동기화 중 오류가 발생했습니다.',
        error: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    ) {
        super(HttpStatus.INTERNAL_SERVER_ERROR, message, error);
    }
}

export class AuthConsentInternalServerError extends AppException {
    constructor(
        message = '약관 동의 처리 중 오류가 발생했습니다.',
        error: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    ) {
        super(HttpStatus.INTERNAL_SERVER_ERROR, message, error);
    }
}

export class PolicyVersionNotFoundError extends AppException {
    constructor(
        message = '최신 약관 정보를 찾을 수 없습니다.',
        error: ErrorCode = ErrorCode.POLICY_VERSION_NOT_FOUND,
    ) {
        super(HttpStatus.NOT_FOUND, message, error);
    }
}
