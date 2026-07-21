import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Ensure environment variables are loaded for this configuration module
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Configuration error: SUPABASE_URL environment variable is missing.');
}

if (!supabaseServiceRoleKey) {
  throw new Error('Configuration error: SUPABASE_SERVICE_ROLE_KEY environment variable is missing.');
}

if (supabaseServiceRoleKey.startsWith('sb_publishable_')) {
  console.warn(
    '⚠️ [SUPABASE CONFIG WARNING] SUPABASE_SERVICE_ROLE_KEY is set to an ANON/PUBLISHABLE key (sb_publishable_...).\n' +
    '   Administrative endpoints like supabase.auth.admin.createUser() WILL FAIL with "This endpoint requires a valid Bearer token".\n' +
    '   Please update SUPABASE_SERVICE_ROLE_KEY in SM-Server/.env with your Supabase service_role secret key.'
  );
}

// Initialize the @supabase/supabase-js client using administrative SERVICE_ROLE_KEY
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

