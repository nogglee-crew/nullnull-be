import { applyDecorators, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

type ApiCustomResponseOptions = {
    statusCode?: number;
    message?: string;
    path?: string;
};

export const ApiCustomResponseDecorator = <TModel extends Type<any>>(
    model: TModel,
    options?: ApiCustomResponseOptions,
) => {
    return applyDecorators(
        ApiExtraModels(model),
        ApiOkResponse({
            schema: {
                properties: {
                    statusCode: { type: 'number', example: options?.statusCode ?? 200 },
                    timestamp: { type: 'string', example: new Date().toISOString() },
                    path: { type: 'string', example: options?.path ?? '/api/v1/...' },
                    message: {
                        type: 'string',
                        example: options?.message ?? '요청이 성공적으로 처리되었습니다.',
                    },
                    data: {
                        $ref: getSchemaPath(model),
                    },
                    error: { type: 'string', nullable: true, example: null },
                },
            },
        }),
    );
};
