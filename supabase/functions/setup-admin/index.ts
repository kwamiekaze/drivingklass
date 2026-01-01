import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Admin email that should receive admin role
const ADMIN_EMAIL = 'kwamekaze@gmail.com'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get the authorization header to identify the user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create client with user's token to get their identity
    const supabaseAnonKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      console.error('Error getting user:', userError)
      return new Response(
        JSON.stringify({ error: 'Could not authenticate user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Setup admin check for user: ${user.email}`)

    // Check if this is the designated admin email
    if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      console.log(`User ${user.email} is not the designated admin`)
      return new Response(
        JSON.stringify({ success: true, isAdmin: false, message: 'Not the designated admin email' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already has admin role
    const { data: existingRole, error: roleCheckError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleCheckError) {
      console.error('Error checking existing role:', roleCheckError)
      throw roleCheckError
    }

    if (existingRole) {
      console.log(`User ${user.email} already has admin role`)
      return new Response(
        JSON.stringify({ success: true, isAdmin: true, message: 'Already an admin' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Grant admin role to the user
    const { error: insertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'admin'
      })

    if (insertError) {
      console.error('Error inserting admin role:', insertError)
      throw insertError
    }

    console.log(`Successfully granted admin role to ${user.email}`)
    
    return new Response(
      JSON.stringify({ success: true, isAdmin: true, message: 'Admin role granted' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error in setup-admin:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
