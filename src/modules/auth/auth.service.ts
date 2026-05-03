import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, User } from '../../generated/prisma/client.js';
import { PolicyType } from '../../generated/prisma/client.js';
import {
    createClient,
    type SupabaseClient,
    type User as SupabaseUser,
} from '@supabase/supabase-js';
import { PrismaService } from '../../database/prisma.service.js';
import {
    AuthConsentInternalServerError,
    AuthSyncInternalServerError,
    InvalidAuthSyncRequestError,
    InvalidAuthTokenError,
    PolicyVersionNotFoundError,
} from './auth.errors.js';
import { AppException } from '../../common/app.exception.js';

type ConsentLookupClient = Pick<Prisma.TransactionClient, 'policyVersion' | 'userConsent'>;

interface AuthSyncResult {
    user: User;
    consentRequired: boolean;
}

const PARTICIPANT_COOKIE_PATTERN = /^participant_uuid_[A-Za-z0-9-]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class AuthService {
    private supabase: SupabaseClient | null = null;

    constructor(
        @Inject(PrismaService)
        private readonly prisma: PrismaService,
    ) {}

    async syncUser(
        authorizationHeader: string | undefined,
        participantUuids: string[],
    ): Promise<AuthSyncResult> {
        try {
            const accessToken = this.extractBearerToken(authorizationHeader);
            const authUser = await this.verifyAccessToken(accessToken);

            return this.prisma.$transaction(async (tx) => {
                const user = await this.findOrCreateUser(tx, authUser);
                const consentRequired = await this.computeConsentRequired(tx, user.userId);

                if (participantUuids.length > 0) {
                    await tx.participant.updateMany({
                        where: {
                            participantUuid: {
                                in: participantUuids,
                            },
                            userId: null,
                        },
                        data: {
                            userId: user.userId,
                        },
                    });
                }

                return {
                    user,
                    consentRequired,
                };
            });
        } catch (error) {
            if (error instanceof AppException) {
                throw error;
            }

            throw new AuthSyncInternalServerError();
        }
    }

    async recordConsent(authorizationHeader: string | undefined): Promise<void> {
        try {
            const accessToken = this.extractBearerToken(authorizationHeader);
            const authUser = await this.verifyAccessToken(accessToken);

            await this.prisma.$transaction(async (tx) => {
                const user = await this.findOrCreateUser(tx, authUser);
                const latestPolicies = await this.getLatestRequiredPolicies(tx);

                if (!latestPolicies) {
                    throw new PolicyVersionNotFoundError();
                }

                const existingConsent = await tx.userConsent.findFirst({
                    where: {
                        userId: user.userId,
                        termsVersionId: latestPolicies.terms.policyVersionId,
                        privacyVersionId: latestPolicies.privacy.policyVersionId,
                    },
                });

                if (existingConsent) {
                    await tx.userConsent.update({
                        where: {
                            consentId: existingConsent.consentId,
                        },
                        data: {
                            agreedAt: new Date(),
                        },
                    });
                } else {
                    await tx.userConsent.create({
                        data: {
                            userId: user.userId,
                            termsVersionId: latestPolicies.terms.policyVersionId,
                            privacyVersionId: latestPolicies.privacy.policyVersionId,
                            agreedAt: new Date(),
                        },
                    });
                }
            });
        } catch (error) {
            if (error instanceof AppException) {
                throw error;
            }

            throw new AuthConsentInternalServerError();
        }
    }

    extractParticipantUuids(cookieHeader: string | undefined): string[] {
        if (!cookieHeader) {
            return [];
        }

        const values = cookieHeader
            .split(';')
            .map((entry) => entry.trim())
            .map((entry) => {
                const separatorIndex = entry.indexOf('=');

                if (separatorIndex === -1) {
                    return null;
                }

                return {
                    key: entry.slice(0, separatorIndex),
                    value: decodeURIComponent(entry.slice(separatorIndex + 1)),
                };
            })
            .filter(
                (
                    entry,
                ): entry is {
                    key: string;
                    value: string;
                } =>
                    !!entry &&
                    PARTICIPANT_COOKIE_PATTERN.test(entry.key) &&
                    UUID_PATTERN.test(entry.value),
            )
            .map((entry) => entry.value);

        return [...new Set(values)];
    }

    private extractBearerToken(authorizationHeader: string | undefined): string {
        if (!authorizationHeader) {
            throw new InvalidAuthSyncRequestError();
        }

        const [scheme, token] = authorizationHeader.split(' ');

        if (scheme !== 'Bearer' || !token) {
            throw new InvalidAuthSyncRequestError();
        }

        return token;
    }

    private async verifyAccessToken(accessToken: string): Promise<SupabaseUser> {
        const {
            data: { user },
            error,
        } = await this.getSupabase().auth.getUser(accessToken);

        if (error || !user) {
            throw new InvalidAuthTokenError();
        }

        return user;
    }

    private async findOrCreateUser(
        tx: Prisma.TransactionClient,
        authUser: SupabaseUser,
    ): Promise<User> {
        const existingUser = await tx.user.findUnique({
            where: {
                userId: authUser.id,
            },
        });

        if (existingUser) {
            return existingUser;
        }

        return tx.user.create({
            data: {
                userId: authUser.id,
                nickname: this.resolveNickname(authUser),
            },
        });
    }

    private async computeConsentRequired(
        tx: ConsentLookupClient,
        userId: string,
    ): Promise<boolean> {
        const latestPolicies = await this.getLatestRequiredPolicies(tx);

        if (!latestPolicies) {
            return true;
        }

        const consent = await tx.userConsent.findFirst({
            where: {
                userId,
                termsVersionId: latestPolicies.terms.policyVersionId,
                privacyVersionId: latestPolicies.privacy.policyVersionId,
            },
        });

        return !consent;
    }

    private async getLatestRequiredPolicies(tx: ConsentLookupClient) {
        const latestPolicies = await tx.policyVersion.findMany({
            where: {
                isLatest: true,
                policyType: {
                    in: [PolicyType.TERMS, PolicyType.PRIVACY],
                },
            },
        });

        const terms = latestPolicies.find((policy) => policy.policyType === PolicyType.TERMS);
        const privacy = latestPolicies.find((policy) => policy.policyType === PolicyType.PRIVACY);

        if (!terms || !privacy) {
            return null;
        }

        return {
            terms,
            privacy,
        };
    }

    private resolveNickname(authUser: SupabaseUser): string {
        const metadata = authUser.user_metadata;
        const candidates = [
            metadata?.nickname,
            metadata?.preferred_username,
            metadata?.full_name,
            metadata?.name,
            typeof authUser.email === 'string' ? authUser.email.split('@')[0] : null,
        ];

        const nickname = candidates.find(
            (value): value is string => typeof value === 'string' && value.trim().length > 0,
        );

        if (nickname) {
            return nickname.slice(0, 50);
        }

        return `user-${authUser.id.slice(0, 8)}`;
    }

    private getSupabase(): SupabaseClient {
        if (this.supabase) {
            return this.supabase;
        }

        this.supabase = createClient(
            this.requireEnv('SUPABASE_URL'),
            this.requireEnv('SUPABASE_PUBLISHABLE_KEY'),
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                    detectSessionInUrl: false,
                },
            },
        );

        return this.supabase;
    }

    private requireEnv(key: string): string {
        const value = process.env[key];

        if (!value) {
            throw new Error(`${key} is not set`);
        }

        return value;
    }
}
