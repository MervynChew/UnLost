import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gqjfopcfzmjfoliccspt.supabase.co'
const supabaseKey = 'sb_publishable_UfiqZ_gZFgQZky2V6JZ23A_Pj1baouk'

export const supabase = createClient(supabaseUrl, supabaseKey)