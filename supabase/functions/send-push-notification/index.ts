import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (req) => {
  try {
    const { notificationId } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get notification details with user's push token
    const { data: notification, error: notifError } = await supabaseClient
      .from('notifications')
      .select('*, profiles(push_token, push_enabled)')
      .eq('notification_id', notificationId)
      .single()

    if (notifError || !notification) {
      throw new Error('Notification not found')
    }

    // Check if user has push enabled and has a token
    if (!notification.profiles.push_enabled || !notification.profiles.push_token) {
      return new Response(
        JSON.stringify({ success: false, reason: 'Push disabled or no token' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Send push notification to Expo
    const pushMessage = {
      to: notification.profiles.push_token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: {
        notification_id: notification.notification_id,
        action_type: notification.action_type,
        action_data: notification.action_data,
      },
    }

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pushMessage),
    })

    const result = await response.json()

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})