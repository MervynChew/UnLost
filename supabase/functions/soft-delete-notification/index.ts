import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { notificationId, notificationIds, userId } = await req.json()

    console.log('Received request:', { notificationId, notificationIds, userId })

    // Handle bulk delete (Clear All)
    if (notificationIds && Array.isArray(notificationIds)) {
      const { error } = await supabaseClient
        .from('notifications')
        .update({ deleted: true })
        .eq('user_id', userId)
        .in('notification_id', notificationIds)

      if (error) {
        console.error('Bulk delete error:', error)
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      console.log(`✅ Bulk deleted ${notificationIds.length} notifications`)
      return new Response(
        JSON.stringify({ success: true, deletedCount: notificationIds.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle single delete
    if (notificationId) {
      const { error } = await supabaseClient
        .from('notifications')
        .update({ deleted: true })
        .eq('notification_id', notificationId)
        .eq('user_id', userId)

      if (error) {
        console.error('Single delete error:', error)
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      console.log('✅ Deleted notification:', notificationId)
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Missing notificationId or notificationIds' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})