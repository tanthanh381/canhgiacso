import { supabase } from "../../supabase";

export function loadPublishedSiteContent() {
  return supabase.rpc("get_public_site_content");
}
