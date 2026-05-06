import { Injectable, type OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const OPENAPI_PLACEHOLDER_DATABASE_URL =
    'postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    constructor() {
        // OpenAPI 생성 시에는 실제 DB 연결 없이 PrismaClient 인스턴스만 구성한다.
        const isGenerateOpenApi = process.env.GENERATE_OPENAPI === 'true';
        const connectionString =
            process.env.DATABASE_URL ??
            (isGenerateOpenApi ? OPENAPI_PLACEHOLDER_DATABASE_URL : undefined);

        if (!connectionString) throw new Error('DATABASE_URL is not set');

        const adapter = new PrismaPg({ connectionString });
        super({ adapter });
    }

    async onModuleInit() {
        // 문서 생성 단계에서는 Nest app만 부팅하고 DB 연결은 건너뛴다.
        if (process.env.GENERATE_OPENAPI === 'true') return;
        await this.$connect();
    }
}
