import { Inject, Injectable } from '@nestjs/common';
import type { User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';

type AuthTransactionClient = Pick<
    PrismaService,
    'participant' | 'policyVersion' | 'user' | 'userConsent'
>;

@Injectable()
export class AuthRepository {
    constructor(
        @Inject(PrismaService)
        private readonly prisma: PrismaService,
    ) {}

    withTransaction<T>(callback: (tx: AuthTransactionClient) => Promise<T>): Promise<T> {
        return this.prisma.$transaction(async (tx) => callback(tx as AuthTransactionClient));
    }

    findUserById(tx: AuthTransactionClient, userId: string) {
        return tx.user.findUnique({
            where: { userId },
        });
    }

    createUser(tx: AuthTransactionClient, userId: string, nickname: string): Promise<User> {
        return tx.user.create({
            data: {
                userId,
                nickname,
            },
        });
    }

    attachAnonymousParticipants(
        tx: AuthTransactionClient,
        participantUuids: string[],
        userId: string,
    ) {
        return tx.participant.updateMany({
            where: {
                participantUuid: { in: participantUuids },
                userId: null,
            },
            data: {
                userId,
            },
        });
    }

    findLatestPolicies(tx: AuthTransactionClient) {
        return tx.policyVersion.findMany({
            where: {
                isLatest: true,
                policyType: { in: ['TERMS', 'PRIVACY'] },
            },
        });
    }

    findConsent(
        tx: AuthTransactionClient,
        userId: string,
        termsVersionId: bigint,
        privacyVersionId: bigint,
    ) {
        return tx.userConsent.findFirst({
            where: {
                userId,
                termsVersionId,
                privacyVersionId,
            },
        });
    }

    updateConsentAgreedAt(tx: AuthTransactionClient, consentId: bigint) {
        return tx.userConsent.update({
            where: { consentId },
            data: { agreedAt: new Date() },
        });
    }

    createConsent(
        tx: AuthTransactionClient,
        userId: string,
        termsVersionId: bigint,
        privacyVersionId: bigint,
    ) {
        return tx.userConsent.create({
            data: {
                userId,
                termsVersionId,
                privacyVersionId,
                agreedAt: new Date(),
            },
        });
    }
}
