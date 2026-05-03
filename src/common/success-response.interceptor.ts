import {
    type CallHandler,
    type ExecutionContext,
    HttpStatus,
    Injectable,
    type NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import { createApiResponse } from './api-response.js';

interface SuccessPayload<T> {
    message: string;
    data: T;
}

@Injectable()
export class SuccessResponseInterceptor<T> implements NestInterceptor<T, unknown> {
    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
        const http = context.switchToHttp();
        const request = http.getRequest<any>();
        const response = http.getResponse<any>();
        const path = request.originalUrl || request.url;

        return next.handle().pipe(
            map((body) => {
                const statusCode =
                    response.statusCode && response.statusCode !== HttpStatus.OK
                        ? response.statusCode
                        : HttpStatus.OK;

                if (!this.isSuccessPayload(body))
                    throw new Error('성공 응답은 반드시 { message, data } 형태여야 합니다.');

                return createApiResponse({
                    statusCode,
                    path,
                    message: body.message,
                    data: body.data,
                    error: null,
                });
            }),
        );
    }

    private isSuccessPayload(value: unknown): value is SuccessPayload<unknown> {
        if (!value || typeof value !== 'object') return false;
        return 'message' in value && 'data' in value;
    }
}
