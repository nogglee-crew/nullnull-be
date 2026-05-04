import {
    type ArgumentsHost,
    Catch,
    type ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { ErrorCode } from '../exception/error-codes.js';

interface HttpExceptionResponseBody {
    statusCode?: number;
    message?: string | string[];
    error?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<any>();
        const request = ctx.getRequest<any>();

        const path = request.originalUrl || request.url;
        const timestamp = new Date().toISOString();

        if (exception instanceof HttpException) {
            const statusCode = exception.getStatus();
            const exceptionResponse = exception.getResponse() as string | HttpExceptionResponseBody;

            const { message, errorCode } = this.extractResponseDetails(
                exceptionResponse,
                statusCode,
            );

            return response.status(statusCode).json({
                statusCode,
                timestamp,
                path,
                message,
                data: null,
                error: errorCode,
            });
        }

        console.error('Unhandled Exception:', exception);

        return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            timestamp,
            path,
            message: '서버 내부 오류가 발생했습니다.',
            data: null,
            error: ErrorCode.INTERNAL_SERVER_ERROR,
        });
    }

    private extractResponseDetails(
        response: string | HttpExceptionResponseBody,
        statusCode: number,
    ): { message: string; errorCode: string } {
        if (typeof response === 'string') {
            return {
                message: response,
                errorCode: this.resolveDefaultErrorCode(statusCode),
            };
        }

        const message = Array.isArray(response.message)
            ? response.message.join(', ')
            : (response.message ?? '요청 처리 중 오류가 발생했습니다.');

        const errorCode = response.error || this.resolveDefaultErrorCode(statusCode);

        return { message, errorCode };
    }

    private resolveDefaultErrorCode(statusCode: number): string {
        const statusName = HttpStatus[statusCode];
        if (statusName && statusName in ErrorCode) {
            return statusName;
        }
        return ErrorCode.INTERNAL_SERVER_ERROR;
    }
}
