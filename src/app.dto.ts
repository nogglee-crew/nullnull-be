import { ApiProperty } from '@nestjs/swagger';

export class BaseSuccessResponseDto {
    @ApiProperty({ example: 200 })
    statusCode!: number;

    @ApiProperty({ example: '2026-05-02T07:45:27.083Z' })
    timestamp!: string;

    @ApiProperty({ example: '/auth/sync' })
    path!: string;

    @ApiProperty({ example: '요청이 성공적으로 처리되었습니다.' })
    message!: string;

    @ApiProperty({ type: String, example: null, nullable: true })
    error!: string | null;
}

export class BaseErrorResponseDto {
    @ApiProperty({ example: 400 })
    statusCode!: number;

    @ApiProperty({ example: '2026-03-18T06:51:10.317Z' })
    timestamp!: string;

    @ApiProperty({ example: '/auth/sync' })
    path!: string;

    @ApiProperty({ example: '유효하지 않은 요청입니다.' })
    message!: string;

    @ApiProperty({ type: Object, example: null, nullable: true })
    data!: null;

    @ApiProperty({ type: String, example: 'INVALID_REQUEST' })
    error!: string;
}
