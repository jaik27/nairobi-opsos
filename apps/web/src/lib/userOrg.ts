import { supabase } from './supabaseClient'

// Resolves the signed-in user's own org_id via their profiles row. RLS
// (profile_self + current_org_id()) already scopes this to exactly their own
// row, so there's nothing to fence client-side — unlike the demo lane in
// demoOrg.ts, which fences to a fixed org because there is no signed-in
// identity to scope by.
export async function getOwnOrgId(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', userId)
    .single()

  if (error) throw error

  return (data as { org_id: string }).org_id
}
