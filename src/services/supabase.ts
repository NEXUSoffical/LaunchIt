import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://hdhtrtklwfkvgebdlbfi.supabase.co";
const supabaseKey = "sb_publishable_Hrx2X_j9uZABtg8cBC3oMw_2lBmgEWn";

export const supabase = createClient(supabaseUrl, supabaseKey);
