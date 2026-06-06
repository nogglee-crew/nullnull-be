import {
    type CallHandler,
    type ExecutionContext,
    HttpStatus,
    Injectable,
    type NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import CustomResponse from '../response/custom-response.js';

interface SuccessPayload<T> {
    message: string;
    data: T;
}

@Injectable()
export class SuccessResponseInterceptor<T> implements NestInterceptor<T, any> {
    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<any> {
        const http = context.switchToHttp();
        const request = http.getRequest<any>();
        const response = http.getResponse<any>();

        const path = request.originalUrl || request.url;

        return next.handle().pipe(
            map((body) => {
                const statusCode = response.statusCode || HttpStatus.OK;

                if (!this.isSuccessPayload(body)) {
                    throw new Error(
                        '성공 응답은 반드시 CustomResponse 인스턴스거나 { message, data } 형태여야 합니다.',
                    );
                }

                return {
                    statusCode: statusCode,
                    timestamp: new Date().toISOString(),
                    path: path,
                    message: body.message,
                    data: body.data,
                    error: null,
                };
            }),
        );
    }

    private isSuccessPayload(value: unknown): value is SuccessPayload<unknown> {
        if (!value || typeof value !== 'object') return false;

        return value instanceof CustomResponse || ('message' in value && 'data' in value);
    }
}
