// Admin-only edge function to fully delete a user and all their related data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return json({ error: "Missing auth" }, 401);

    // Verify caller and admin role using their JWT
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const callerId = userData.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin");
    if (!roleRows || roleRows.length === 0) return json({ error: "Not an admin" }, 403);

    const { user_id } = await req.json();
    if (!user_id) return json({ error: "user_id required" }, 400);
    if (user_id === callerId) return json({ error: "Cannot delete yourself" }, 400);

    // Find conversations involving the user, then delete their messages
    const { data: convs } = await admin
      .from("conversations")
      .select("id")
      .or(`user1_id.eq.${user_id},user2_id.eq.${user_id}`);
    const convIds = (convs ?? []).map((c: any) => c.id);
    if (convIds.length > 0) {
      await admin.from("messages").delete().in("conversation_id", convIds);
      await admin.from("conversations").delete().in("id", convIds);
    }
    await admin.from("messages").delete().eq("sender_id", user_id);

    // Find team posts owned by user, then delete applications to those posts
    const { data: posts } = await admin.from("team_posts").select("id").eq("user_id", user_id);
    const postIds = (posts ?? []).map((p: any) => p.id);
    if (postIds.length > 0) {
      await admin.from("team_applications").delete().in("team_post_id", postIds);
    }
    // Delete user's own applications
    await admin.from("team_applications").delete().eq("applicant_id", user_id);

    // Delete questions and their answers
    const { data: qs } = await admin.from("anon_questions").select("id").eq("user_id", user_id);
    const qIds = (qs ?? []).map((q: any) => q.id);
    if (qIds.length > 0) {
      await admin.from("anon_answers").delete().in("question_id", qIds);
    }
    await admin.from("anon_answers").delete().eq("user_id", user_id);

    // Delete content owned by user
    await admin.from("team_posts").delete().eq("user_id", user_id);
    await admin.from("anon_questions").delete().eq("user_id", user_id);
    await admin.from("notes").delete().eq("user_id", user_id);
    await admin.from("events").delete().eq("user_id", user_id);
    await admin.from("notifications").delete().eq("user_id", user_id);
    await admin.from("staff_verifications").delete().eq("user_id", user_id);
    await admin.from("user_roles").delete().eq("user_id", user_id);
    await admin.from("profiles").delete().eq("id", user_id);

    // Finally, delete the auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(user_id);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ success: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
