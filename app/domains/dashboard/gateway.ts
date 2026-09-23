import { supabase } from "../../supabase";

export async function loadCisoDashboardData() {
  const [dashboard, history] = await Promise.all([
    supabase.rpc("get_ciso_dashboard"),
    supabase.rpc("get_training_history_summary"),
  ]);
  return { dashboard, history };
}
