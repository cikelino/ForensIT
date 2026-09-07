import { createClient } from "@supabase/supabase-js";

// Questo client usa la SERVICE ROLE KEY: va usato solo dentro le API routes
// (lato server), MAI esposto al browser.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
