import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dcchrewsbpzojkglsomy.supabase.co";
const supabaseKey = "sb_publishable_z9sDSz8ZKGpaWl75kNHQwg_QZl12vvM";

export const supabase = createClient(supabaseUrl, supabaseKey);
