import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes.js';
import { createApiResponse } from './api-response.js';

interface HttpExceptionResponseBody {
    statusCode?: number;
    message?: string | string[];
    error?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    // INFO: 발생한 예외를 공통 실패 응답 포맷으로 변환한다.
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<any>();
        const request = ctx.getRequest<any>();
        const path = request.originalUrl || request.url;

        if (exception instanceof HttpException) {
            const statusCode = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            const { message, error } = this.extractHttpExceptionResponse(exceptionResponse);

            return response.status(statusCode).json(
                createApiResponse({
                    statusCode,
                    path,
                    message,
                    data: null,
                    error: error ?? this.resolveErrorCode(statusCode),
                }),
            );
        }

        return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
            createApiResponse({
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                path,
                message: '서버 내부 오류가 발생했습니다.',
                data: null,
                error: ErrorCode.INTERNAL_SERVER_ERROR,
            }),
        );
    }

    // INFO: Nest 예외 응답에서 message와 error 값을 꺼내기 쉽게 정리한다.
    private extractHttpExceptionResponse(response: string | HttpExceptionResponseBody): {
        message: string;
        error: string | null;
    } {
        if (typeof response === 'string') {
            return {
                message: response,
                error: null,
            };
        }

        return {
            message: Array.isArray(response.message)
                ? response.message.join(', ')
                : (response.message ?? '요청 처리 중 오류가 발생했습니다.'),
            error: response.error ?? null,
        };
    }

    // INFO: 커스텀 error code가 없을 때 HTTP 상태코드 기반 기본 에러 코드를 반환한다.
    private resolveErrorCode(statusCode: number): ErrorCode {
        const statusName = HttpStatus[statusCode];
        if (typeof statusName === 'string' && statusName in ErrorCode)
            return statusName as ErrorCode;
        return ErrorCode.INTERNAL_SERVER_ERROR;
    }
}
