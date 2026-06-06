import { createClient } from '@supabase/supabase-js';

function requireEnv(key) {
    const value = process.env[key];

    if (!value) {
        throw new Error(`${key} is not set`);
    }

    return value;
}

async function main() {
    const supabase = createClient(
        requireEnv('SUPABASE_URL'),
        requireEnv('SUPABASE_PUBLISHABLE_KEY'),
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false,
            },
        },
    );

    const { data, error } = await supabase.auth.signInWithPassword({
        email: requireEnv('SUPABASE_TEST_EMAIL'),
        password: requireEnv('SUPABASE_TEST_PASSWORD'),
    });

    if (error) {
        throw error;
    }

    const accessToken = data.session?.access_token;

    if (!accessToken) {
        throw new Error('access token was not issued');
    }

    console.log(accessToken);
}

main().catch((error) => {
    console.error('[get-test-token] failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
