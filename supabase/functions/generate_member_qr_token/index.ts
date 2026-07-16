import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as jose from "https://deno.land/x/jose@v5.2.2/index.ts"

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "fallback-secret-for-development";
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), { 
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!user || authError) {
      return new Response(JSON.stringify({ error: "Unauthorized", details: authError?.message }), { 
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      // Body might be empty
    }
    const { device_id, session_id } = body as any;

    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + 35;
    const secret = new TextEncoder().encode(JWT_SECRET);
    
    const payload = {
      member_id: user.id,
      session_id: session_id || 'unknown_session',
      device_id: device_id || 'unknown_device',
      iat: issuedAt,
      exp: expiresAt,
    };

    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret);

    return new Response(
      JSON.stringify({ token: jwt, issued_at: issuedAt, expires_at: expiresAt }), 
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
})
