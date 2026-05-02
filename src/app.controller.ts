import { Controller, Get, Inject } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { AppService } from './app.service.js';

@ApiExcludeController()
@Controller()
export class AppController {
    constructor(
        @Inject(AppService)
        private readonly appService: AppService,
    ) {}

    @Get('health')
    getHealth() {
        return {
            message: '헬스 체크가 완료되었습니다.',
            data: this.appService.getHealth(),
        };
    }
}
