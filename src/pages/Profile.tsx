import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Check, X, Trash2, User as UserIcon, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Profile { id: string; full_name: string | null; college: string | null; branch: string | null; year: string | null; bio: string | null; avatar_url: string | null; }

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myNotes, setMyNotes] = useState<any[]>([]);
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [received, setReceived] = useState<any[]>([]);
  const [sent, setSent] = useState<any[]>([]);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    const [p, n, e, t] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("notes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("events").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("team_posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setProfile(p.data);
    setMyNotes(n.data ?? []);
    setMyEvents(e.data ?? []);
    setMyTeams(t.data ?? []);

    // received applications: any application on my team_posts
    const myTeamIds = (t.data ?? []).map((tp) => tp.id);
    if (myTeamIds.length) {
      const { data: rec } = await supabase.from("team_applications").select("*").in("team_post_id", myTeamIds).order("created_at", { ascending: false });
      if (rec) {
        const applicantIds = [...new Set(rec.map((r) => r.applicant_id))];
        const { data: profs } = await supabase.from("profiles").select("id, full_name, college").in("id", applicantIds);
        setReceived(rec.map((r) => ({ ...r, applicant: profs?.find((pp) => pp.id === r.applicant_id), post: t.data!.find((tp) => tp.id === r.team_post_id) })));
      }
    } else setReceived([]);

    // sent applications
    const { data: s } = await supabase.from("team_applications").select("*").eq("applicant_id", user.id).order("created_at", { ascending: false });
    if (s) {
      const postIds = [...new Set(s.map((x) => x.team_post_id))];
      const { data: posts } = await supabase.from("team_posts").select("id, title").in("id", postIds);
      setSent(s.map((x) => ({ ...x, post: posts?.find((pp) => pp.id === x.team_post_id) })));
    } else setSent([]);

    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [user]);

  const save = async () => {
    if (!user || !profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name, college: profile.college, branch: profile.branch,
      year: profile.year, bio: profile.bio,
    }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved!");
  };

  const updateAppStatus = async (id: string, status: "accepted" | "rejected") => {
    const { error } = await supabase.from("team_applications").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Application ${status}`);
    loadAll();
  };

  const deleteRow = async (table: "notes" | "events" | "team_posts", id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    loadAll();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="h-24 w-24 rounded-3xl gradient-hero flex items-center justify-center text-white shadow-elevated shrink-0">
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover rounded-3xl" /> : <UserIcon className="h-10 w-10" />}
        </div>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold">{profile?.full_name ?? "Your profile"}</h1>
          <p className="text-muted-foreground">{user?.email}</p>
          {profile?.college && <Badge variant="secondary" className="mt-2">{profile.college}</Badge>}
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="notes">Notes ({myNotes.length})</TabsTrigger>
          <TabsTrigger value="events">Events ({myEvents.length})</TabsTrigger>
          <TabsTrigger value="teams">Teams ({myTeams.length})</TabsTrigger>
          <TabsTrigger value="received">Received ({received.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({sent.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 bg-card border border-border/50 rounded-2xl p-6 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Full name</Label><Input maxLength={100} value={profile?.full_name ?? ""} onChange={(e) => setProfile({ ...profile!, full_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>College</Label><Input maxLength={120} value={profile?.college ?? ""} onChange={(e) => setProfile({ ...profile!, college: e.target.value })} /></div>
            <div className="space-y-2"><Label>Branch</Label><Input maxLength={80} value={profile?.branch ?? ""} onChange={(e) => setProfile({ ...profile!, branch: e.target.value })} placeholder="CSE, ECE, etc." /></div>
            <div className="space-y-2"><Label>Year</Label><Input maxLength={20} value={profile?.year ?? ""} onChange={(e) => setProfile({ ...profile!, year: e.target.value })} placeholder="3rd year" /></div>
          </div>
          <div className="space-y-2"><Label>Bio</Label><Textarea maxLength={300} value={profile?.bio ?? ""} onChange={(e) => setProfile({ ...profile!, bio: e.target.value })} placeholder="Tell others about yourself..." /></div>
          <Button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground border-0">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
        </TabsContent>

        <TabsContent value="notes" className="space-y-3 mt-4">
          {myNotes.length === 0 && <Empty msg="No notes shared yet" />}
          {myNotes.map((n) => (
            <Row key={n.id} title={n.title} sub={n.subject} date={n.created_at} onDelete={() => deleteRow("notes", n.id)} />
          ))}
        </TabsContent>

        <TabsContent value="events" className="space-y-3 mt-4">
          {myEvents.length === 0 && <Empty msg="No events posted yet" />}
          {myEvents.map((e) => (
            <Row key={e.id} title={e.title} sub={e.category} date={e.created_at} onDelete={() => deleteRow("events", e.id)} />
          ))}
        </TabsContent>

        <TabsContent value="teams" className="space-y-3 mt-4">
          {myTeams.length === 0 && <Empty msg="No team posts yet" />}
          {myTeams.map((t) => (
            <Row key={t.id} title={t.title} sub={`${t.project_type} · ${t.team_size} members`} date={t.created_at} onDelete={() => deleteRow("team_posts", t.id)} />
          ))}
        </TabsContent>

        <TabsContent value="received" className="space-y-3 mt-4">
          {received.length === 0 && <Empty msg="No one has applied to your teams yet" />}
          {received.map((r) => (
            <div key={r.id} className="bg-card border border-border/50 rounded-2xl p-5">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1">For: <span className="font-medium text-foreground">{r.post?.title}</span></div>
                  <div className="font-semibold">{r.applicant?.full_name ?? "Student"} {r.applicant?.college && <span className="text-xs text-muted-foreground font-normal">· {r.applicant.college}</span>}</div>
                  {r.message && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{r.message}</p>}
                  <div className="text-xs text-muted-foreground mt-2">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</div>
                </div>
                <div className="flex gap-2">
                  {r.status === "pending" ? (
                    <>
                      <Button size="sm" onClick={() => updateAppStatus(r.id, "accepted")} className="bg-success text-success-foreground hover:opacity-90"><Check className="h-4 w-4" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => updateAppStatus(r.id, "rejected")}><X className="h-4 w-4" /></Button>
                    </>
                  ) : r.status === "accepted" ? (
                    <Button size="sm" onClick={() => navigate("/app/messages")} className="gradient-primary text-primary-foreground border-0">
                      <MessageSquare className="h-4 w-4 mr-1" /> Chat
                    </Button>
                  ) : (
                    <Badge variant="secondary">{r.status}</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="sent" className="space-y-3 mt-4">
          {sent.length === 0 && <Empty msg="You haven't applied to any team yet" />}
          {sent.map((s) => (
            <div key={s.id} className="bg-card border border-border/50 rounded-2xl p-5 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{s.post?.title ?? "Team post"}</div>
                {s.message && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.message}</p>}
                <div className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}</div>
              </div>
              {s.status === "accepted" ? (
                <Button size="sm" onClick={() => navigate("/app/messages")} className="gradient-primary text-primary-foreground border-0">
                  <MessageSquare className="h-4 w-4 mr-1" /> Chat
                </Button>
              ) : (
                <Badge variant={s.status === "rejected" ? "destructive" : "secondary"}>{s.status}</Badge>
              )}
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const Empty = ({ msg }: { msg: string }) => (
  <div className="text-center py-12 text-muted-foreground bg-card border border-border/50 rounded-2xl">{msg}</div>
);

const Row = ({ title, sub, date, onDelete }: { title: string; sub?: string | null; date: string; onDelete: () => void }) => (
  <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center justify-between gap-3">
    <div className="min-w-0">
      <div className="font-semibold truncate">{title}</div>
      <div className="text-xs text-muted-foreground">{sub} · {formatDistanceToNow(new Date(date), { addSuffix: true })}</div>
    </div>
    <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
  </div>
);
