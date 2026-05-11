import { type User as SupabaseUser } from '@supabase/supabase-js';

export interface AuthenticatedRequest {
    authUser: SupabaseUser;
}

export interface OptionalAuthenticatedRequest {
    authUser?: SupabaseUser;
}
