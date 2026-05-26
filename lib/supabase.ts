import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
  );
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export type Question = {
  id: string;
  content: string;
  status: "active" | "closed";
  created_at: string;
  published_at: string | null;
  closed_at: string | null;
};

export type Submission = {
  id: string;
  question_id: string;
  raw_text: string;
  client_session_id: string | null;
  created_at: string;
};
