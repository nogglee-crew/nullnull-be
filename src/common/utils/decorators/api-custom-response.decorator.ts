import { applyDecorators, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

export const ApiCustomResponseDecorator = <TModel extends Type<any>>(model: TModel) => {
    return applyDecorators(
        ApiExtraModels(model),
        ApiOkResponse({
            schema: {
                properties: {
                    statusCode: { type: 'number', example: 200 },
                    timestamp: { type: 'string', example: new Date().toISOString() },
                    path: { type: 'string', example: '/api/v1/...' },
                    message: { type: 'string', example: '요청이 성공적으로 처리되었습니다.' },
                    data: {
                        $ref: getSchemaPath(model),
                    },
                    error: { type: 'string', nullable: true, example: null },
                },
            },
        }),
    );
};
