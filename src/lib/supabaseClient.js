import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
/** Clave anon JWT o publishable (sb_publishable_...) desde el panel de Supabase */
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '[ALISAGRO] Faltan variables de entorno: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. ' +
      'En local: archivo .env. En Vercel: Project Settings → Environment Variables.'
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseKey ?? '', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})
