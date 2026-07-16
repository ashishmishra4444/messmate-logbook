import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as jose from "https://deno.land/x/jose@v5.2.2/index.ts"

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "fallback-secret-for-development";
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { scans } = body; // Array of offline scan items
    
    if (!scans || !Array.isArray(scans)) {
      return errorResponse(400, "invalid_request", "Missing scans array");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const results = [];

    // Process scans sequentially to maintain order and handle errors individually
    for (const scan of scans) {
      const { id: queue_id, auth_type, payload, scanner_device_id, scanner_name, offline_timestamp, meal_session_id, meal_type } = scan;
      
      try {
        let memberId = "";
        
        if (auth_type === 'qr') {
          const secret = new TextEncoder().encode(JWT_SECRET);
          // Even if expired, we allow it for offline sync because it was valid AT THE TIME
          const { payload: jwtPayload } = await jose.jwtVerify(payload, secret, { currentDate: new Date(offline_timestamp) });
          memberId = jwtPayload.member_id as string;
        } else if (auth_type === 'manual') {
           memberId = payload.member_id; // For manual, payload is just the member id
        } else {
           throw new Error("Unsupported auth type");
        }

        // Fetch actual member
        let { data: memberData } = await supabase
          .from('members')
          .select('id, name')
          .eq('user_id', memberId)
          .limit(1)
          .maybeSingle();

        // Fallback for Demo test member
        if (!memberData && auth_type === 'qr') {
          const { data: newMember } = await supabase
            .from('members')
            .insert({ user_id: memberId, name: 'Test Member (Offline Auto-created)', mobile: '0000', room_number: 'TEST', meal_plan: 'both' })
            .select('id, name').single();
          memberData = newMember;
        }

        if (!memberData) throw new Error("Member not found");

        // Insert attendance
        const { error: insertError } = await supabase
          .from('attendance')
          .insert({
            user_id: memberId, // RLS visibility
            member_id: memberData.id,
            date: new Date(offline_timestamp).toISOString().split('T')[0],
            meal_session_id: meal_session_id,
            meal_type: meal_type,
            auth_method: auth_type,
            scanner_device_id: scanner_device_id || null,
            scanner_name: scanner_name || 'Kitchen Scanner (Offline Sync)',
            scanned_at: new Date(offline_timestamp).toISOString()
          });

        if (insertError) {
          if (insertError.code === '23505') {
            // Duplicate - resolve silently as success
            results.push({ queue_id, status: 'resolved_duplicate' });
          } else {
            throw insertError;
          }
        } else {
          results.push({ queue_id, status: 'success' });
        }

      } catch (err: any) {
        results.push({ queue_id, status: 'error', reason: err.message });
      }
    }

    return new Response(JSON.stringify({ results }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    return errorResponse(500, "server_error", error.message);
  }
});

function errorResponse(statusCode: number, reason: string, message: string) {
  return new Response(JSON.stringify({ status: "rejected", reason, message }), { 
    status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } 
  });
}
