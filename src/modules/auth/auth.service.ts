import { HttpStatus, Injectable } from '@nestjs/common';
import type { User } from '../../generated/prisma/client.js';
import { PolicyType } from '../../generated/prisma/client.js';
import { type User as SupabaseUser } from '@supabase/supabase-js';
import { type PrismaService } from '../../database/prisma.service.js';
import { ErrorCode } from '../../common/exception/error-codes.js';
import { AppException } from '../../common/exception/app.exception.js';

type UserLookupClient = Pick<PrismaService, 'user'>;
type ConsentLookupClient = Pick<PrismaService, 'policyVersion' | 'userConsent'>;

interface IAuthSyncResult {
    user: User;
    consentRequired: boolean;
}

interface IAuthConsentResult {
    consentRequired: boolean;
}

const PARTICIPANT_COOKIE_PATTERN = /^participant_uuid_[A-Za-z0-9-]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class AuthService {
    constructor(private readonly prisma: PrismaService) {}

    // INFO: Supabase 인증 사용자를 동기화하고, 필요한 경우 약관 동의 여부를 반환한다.
    async syncUser(authUser: SupabaseUser, participantUuids: string[]): Promise<IAuthSyncResult> {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const user = await this.findOrCreateUser(tx, authUser);
                const consentRequired = await this.computeConsentRequired(tx, user.userId);

                if (participantUuids.length > 0) {
                    // 이미 로그인 사용자와 연결된 participant는 다른 계정으로 재연결하지 않는다.
                    await tx.participant.updateMany({
                        where: {
                            participantUuid: { in: participantUuids },
                            userId: null,
                        },
                        data: {
                            userId: user.userId,
                        },
                    });
                }

                return { user, consentRequired };
            });
        } catch (error) {
            if (error instanceof AppException) throw error;
            console.error('Auth Sync Error:', error);
            throw new AppException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                '사용자 동기화 중 오류가 발생했습니다.',
                ErrorCode.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // INFO: auth sync 요청 쿠키에서 익명 참여자 UUID 목록을 추출한다.
    extractParticipantUuids(cookieHeader: string | undefined): string[] {
        if (!cookieHeader) return [];

        // participant 연결 쿠키만 선별하고, 값은 UUID 형식일 때만 신뢰한다.
        const values = cookieHeader
            .split(';')
            .map((entry) => entry.trim())
            .map((entry) => {
                const separatorIndex = entry.indexOf('=');
                if (separatorIndex === -1) return null;
                return {
                    key: entry.slice(0, separatorIndex),
                    value: decodeURIComponent(entry.slice(separatorIndex + 1)),
                };
            })
            .filter(
                (entry): entry is { key: string; value: string } =>
                    !!entry &&
                    PARTICIPANT_COOKIE_PATTERN.test(entry.key) &&
                    UUID_PATTERN.test(entry.value),
            )
            .map((entry) => entry.value);

        return [...new Set(values)];
    }

    // INFO: 최신 약관/개인정보처리방침 조합에 대한 사용자 동의를 기록한다.
    async recordConsent(authUser: SupabaseUser): Promise<IAuthConsentResult> {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const user = await this.findOrCreateUser(tx, authUser);
                // 동의는 항상 현재 latest 약관/개인정보처리방침 조합을 기준으로 기록한다.
                const latestPolicies = await this.getLatestRequiredPolicies(tx);

                if (!latestPolicies) {
                    throw new AppException(
                        HttpStatus.NOT_FOUND,
                        '최신 약관 정보를 찾을 수 없습니다.',
                        ErrorCode.POLICY_VERSION_NOT_FOUND,
                    );
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
                        where: { consentId: existingConsent.consentId },
                        data: { agreedAt: new Date() },
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

                return { consentRequired: false };
            });
        } catch (error) {
            if (error instanceof AppException) throw error;
            throw new AppException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                '약관 동의 처리 중 오류가 발생했습니다.',
                ErrorCode.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // INFO: Supabase 사용자 식별자 기준으로 서비스 사용자를 조회하거나 생성한다.
    private async findOrCreateUser(tx: UserLookupClient, authUser: SupabaseUser): Promise<User> {
        const existingUser = await tx.user.findUnique({
            where: { userId: authUser.id },
        });

        if (existingUser) return existingUser;

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
        if (!latestPolicies) return false;

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
                policyType: { in: [PolicyType.TERMS, PolicyType.PRIVACY] },
            },
        });

        const terms = latestPolicies.find((p) => p.policyType === PolicyType.TERMS);
        const privacy = latestPolicies.find((p) => p.policyType === PolicyType.PRIVACY);

        if (!terms || !privacy) return null;

        return { terms, privacy };
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
            (v): v is string => typeof v === 'string' && v.trim().length > 0,
        );

        if (nickname) return nickname.slice(0, 50);
        return `user-${authUser.id.slice(0, 8)}`;
    }
}
