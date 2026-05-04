import { HttpException } from '@nestjs/common';
import { type ErrorCode } from './error-codes.js';

export class AppException extends HttpException {
    constructor(statusCode: number, message: string, error: ErrorCode) {
        super(
            {
                statusCode,
                message,
                error,
            },
            statusCode,
        );
    }
}
