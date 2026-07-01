import { supabase } from './supabaseClient'

// Mirrors getOwnOrgId in userOrg.ts: reads the signed-in user's role from
// profiles. Returns null if the user is unprovisioned or the query fails —
// a null role is treated as no-permission everywhere it's checked.
export async function getUserRole(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  if (error) return null
  return (data as { role: string }).role
}
