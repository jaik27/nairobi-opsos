import { supabase } from './supabaseClient'

let cachedDemoOrgId: string | null = null

// The only anon-writable org (see migration 002's is_demo fence and 004's
// anon-insert policies). Looked up rather than hardcoded so the client never
// embeds a magic UUID.
export async function getDemoOrgId(): Promise<string> {
  if (cachedDemoOrgId) return cachedDemoOrgId

  const { data, error } = await supabase.from('orgs').select('id').eq('is_demo', true).single()

  if (error) throw error

  cachedDemoOrgId = (data as { id: string }).id
  return cachedDemoOrgId
}
