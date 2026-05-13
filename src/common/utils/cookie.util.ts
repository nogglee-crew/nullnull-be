export const CookieUtil = {
    getCookie(cookieHeader: string | undefined, key: string): string | undefined {
        if (!cookieHeader) return undefined;

        const cookies = cookieHeader.split(';');

        for (const cookie of cookies) {
            const [cookieKey, ...cookieValue] = cookie.trim().split('=');

            if (cookieKey === key) {
                return decodeURIComponent(cookieValue.join('='));
            }
        }
        return undefined;
    },

    getParticipantCookieKey(slug: string): string {
        return `participant_uuid_${slug}`;
    },
};
