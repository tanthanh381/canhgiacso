import { supabase } from "../../supabase";

export function loadTrainingAccountData(userId: string) {
  return Promise.all([
    supabase.from("profiles").select("username, display_name, created_at").eq("id", userId).single(),
    supabase.rpc("get_game_state"),
    supabase.rpc("get_my_training_certificates"),
  ]);
}

export function submitTrainingChoice(runId: string, scenarioId: number, choiceIndex: number) {
  return supabase.rpc("submit_game_choice", {
    expected_run: runId,
    scenario_id: scenarioId,
    choice_index: choiceIndex,
  });
}

export function restartTrainingRun(runId: string) {
  return supabase.rpc("restart_game", { expected_run: runId });
}

export function loadTrainingCertificates() {
  return supabase.rpc("get_my_training_certificates");
}

export function issueTrainingCertificate(runId: string) {
  return supabase.rpc("issue_training_certificate", { expected_run: runId });
}
