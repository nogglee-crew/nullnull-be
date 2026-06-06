import { Injectable, type PipeTransform, HttpStatus } from '@nestjs/common';
import { AppException } from '../exception/app.exception.js';
import { ErrorCode } from '../exception/error-codes.js';

@Injectable()
export class ParseBigIntPipe implements PipeTransform<string, bigint> {
    transform(value: string): bigint {
        if (!/^\d+$/.test(value)) {
            throw new AppException(
                HttpStatus.BAD_REQUEST,
                '파라미터가 숫자 형식이 아닙니다.',
                ErrorCode.INVALID_PATH_PARAM,
            );
        }

        return BigInt(value);
    }
}
