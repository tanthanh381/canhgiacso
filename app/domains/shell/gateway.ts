import { supabase } from "../../supabase";

export type ManagementRole = "admin" | "editor";

/** The role the signed-in account holds in the content management area, or null for ordinary members. */
export async function loadManagementRole(): Promise<ManagementRole | null> {
  const { data } = await supabase.rpc("get_content_management_role");
  return data === "admin" || data === "editor" ? data : null;
}
