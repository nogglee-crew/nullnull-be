import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMeRequestDto {
    @ApiProperty({ example: '김개발', description: '변경할 닉네임 (2~10자, 공백 불가)' })
    @IsString()
    @Length(2, 10, { message: '닉네임은 2자 이상 10자 이하로 입력해주세요.' })
    @Matches(/^\S+$/, { message: '닉네임에 공백을 포함할 수 없습니다.' })
    nickname: string;
}
