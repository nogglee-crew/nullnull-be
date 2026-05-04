import { Inject, Injectable } from '@nestjs/common';
import type { User } from '../../generated/prisma/client.js';
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
import { AppException } from '../../common/exceptions/app.exception.js';

type UserLookupClient = Pick<PrismaService, 'user'>;
type ConsentLookupClient = Pick<PrismaService, 'policyVersion' | 'userConsent'>;

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

    // INFO: Supabase 인증 사용자와 서비스 사용자를 동기화하고 익명 참여 이력을 연결한다.
    async syncUser(
        authorizationHeader: string | undefined,
        participantUuids: string[],
    ): Promise<AuthSyncResult> {
        try {
            const accessToken = this.extractBearerToken(authorizationHeader);
            const authUser = await this.verifyAccessToken(accessToken);

            // 사용자 생성, 동의 상태 계산, 익명 참여자 연결은 같은 인증 스냅샷으로 처리한다.
            return this.prisma.$transaction(async (tx) => {
                const user = await this.findOrCreateUser(tx, authUser);
                const consentRequired = await this.computeConsentRequired(tx, user.userId);

                if (participantUuids.length > 0) {
                    // 이미 로그인 사용자와 연결된 participant는 다른 계정으로 재연결하지 않는다.
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

    // INFO: 최신 약관/개인정보처리방침 조합에 대한 사용자 동의를 기록한다.
    async recordConsent(authorizationHeader: string | undefined): Promise<void> {
        try {
            const accessToken = this.extractBearerToken(authorizationHeader);
            const authUser = await this.verifyAccessToken(accessToken);

            await this.prisma.$transaction(async (tx) => {
                const user = await this.findOrCreateUser(tx, authUser);
                // 동의는 항상 현재 latest 약관/개인정보처리방침 조합을 기준으로 기록한다.
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
                    // 같은 버전에 대한 재동의는 새 레코드를 만들지 않고 동의 시각만 갱신한다.
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

    // INFO: auth sync 요청 쿠키에서 익명 참여자 UUID 목록을 추출한다.
    extractParticipantUuids(cookieHeader: string | undefined): string[] {
        if (!cookieHeader) {
            return [];
        }

        // participant 연결 쿠키만 선별하고, 값은 UUID 형식일 때만 신뢰한다.
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

    // INFO: Authorization header에서 Bearer access token을 추출한다.
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

    // INFO: Supabase access token을 서버에서 검증하고 인증 사용자를 반환한다.
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

    // INFO: Supabase 사용자 식별자 기준으로 서비스 사용자를 조회하거나 생성한다.
    private async findOrCreateUser(tx: UserLookupClient, authUser: SupabaseUser): Promise<User> {
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

    // INFO: 사용자가 최신 필수 정책 조합에 동의해야 하는지 계산한다.
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

    // INFO: 현재 latest로 지정된 필수 약관/개인정보처리방침 버전을 조회한다.
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

    // INFO: Supabase 사용자 메타데이터와 이메일에서 서비스 닉네임을 결정한다.
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

    // INFO: Supabase client를 지연 초기화해 재사용한다.
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

    // INFO: 필수 환경변수 값을 조회하고 누락 시 설정 오류를 발생시킨다.
    private requireEnv(key: string): string {
        const value = process.env[key];

        if (!value) {
            throw new Error(`${key} is not set`);
        }

        return value;
    }
}
