// Edge function: submit-faculty-proof
// Allows a freshly-signed-up faculty (no session yet because of email confirmation)
// to upload their proof. Uses the service role to bypass storage RLS.
// Security: only accepts uploads for users whose role is 'pending_staff' and who
// don't already have a verification row. The user_id is verified against auth.users.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_id, file_base64, file_name, note } = await req.json();
    if (!user_id || !file_base64 || !file_name) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify user exists
    const { data: userRes, error: userErr } = await supabase.auth.admin.getUserById(user_id);
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify role is pending_staff
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user_id);
    const isPending = (roles ?? []).some((r: any) => r.role === "pending_staff");
    if (!isPending) {
      return new Response(JSON.stringify({ error: "User is not pending faculty" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode base64
    const b64 = file_base64.includes(",") ? file_base64.split(",")[1] : file_base64;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const ext = (file_name.split(".").pop() || "bin").toLowerCase();
    const path = `${user_id}/${Date.now()}.${ext}`;

    const contentType = ext === "pdf" ? "application/pdf" :
                        ext === "png" ? "image/png" :
                        ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
                        ext === "webp" ? "image/webp" : "application/octet-stream";

    const { error: upErr } = await supabase.storage.from("staff-proofs").upload(path, bytes, {
      contentType, upsert: false,
    });
    if (upErr) {
      return new Response(JSON.stringify({ error: "Upload failed: " + upErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert verification row (delete any existing pending then insert)
    await supabase.from("staff_verifications").delete().eq("user_id", user_id).eq("status", "pending");
    const { error: insErr } = await supabase.from("staff_verifications").insert({
      user_id, proof_url: path, note: note ?? null,
    });
    if (insErr) {
      return new Response(JSON.stringify({ error: "Record failed: " + insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, path }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
