import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Plus, Loader2, Send, Sparkles, Rocket, Briefcase, Code2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRole } from "@/hooks/useRole";
import { DeleteButton } from "@/components/DeleteButton";

interface TeamPost {
  id: string; user_id: string; title: string; description: string | null;
  project_type: string | null; skills_needed: string | null; team_size: number | null;
  college: string | null; status: string; created_at: string;
  profiles?: { full_name: string | null } | null;
  has_applied?: boolean;
}

export default function Teams() {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const [posts, setPosts] = useState<TeamPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", project_type: "Hackathon", skills_needed: "", team_size: 4, college: "" });
  const [applyTo, setApplyTo] = useState<TeamPost | null>(null);
  const [applyMsg, setApplyMsg] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("team_posts").select("*").order("created_at", { ascending: false });
    if (data && user) {
      const userIds = [...new Set(data.map((p) => p.user_id))];
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const { data: myApps } = await supabase.from("team_applications").select("team_post_id").eq("applicant_id", user.id);
      const appliedSet = new Set((myApps ?? []).map((a) => a.team_post_id));
      setPosts(data.map((p) => ({
        ...p,
        profiles: profs?.find((pr) => pr.id === p.user_id) ?? null,
        has_applied: appliedSet.has(p.id),
      })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("team_posts").insert({
      user_id: user.id, title: form.title, description: form.description || null,
      project_type: form.project_type, skills_needed: form.skills_needed || null,
      team_size: form.team_size, college: form.college || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Team post created!");
    setOpen(false);
    setForm({ title: "", description: "", project_type: "Hackathon", skills_needed: "", team_size: 4, college: "" });
    load();
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !applyTo) return;
    setSubmitting(true);
    const { error } = await supabase.from("team_applications").insert({
      team_post_id: applyTo.id, applicant_id: user.id, message: applyMsg || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Application sent!");
    setApplyTo(null); setApplyMsg("");
    load();
  };

  const openCount = posts.filter((p) => p.status === "open").length;
  const totalSpots = posts.reduce((sum, p) => sum + (p.team_size ?? 0), 0);
  const projectTypes = new Set(posts.map((p) => p.project_type).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-3xl p-6 md:p-10 text-white relative overflow-hidden shadow-elevated" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}>
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -left-10 -bottom-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur px-3 py-1 text-xs font-medium mb-3">
              <Sparkles className="h-3.5 w-3.5" /> Build something legendary
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">🚀 Team Finder</h1>
            <p className="text-white/90 max-w-xl">Hackathons, startups, side projects — find the right people to ship with.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <TeamStat icon={Rocket} label="Open" val={openCount} />
            <TeamStat icon={Users} label="Spots" val={totalSpots} />
            <TeamStat icon={Briefcase} label="Types" val={projectTypes} />
          </div>
        </div>
      </section>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Code2 className="h-4 w-4 text-primary" />
          {posts.length === 0 ? "No teams posted yet" : `${posts.length} team${posts.length > 1 ? "s" : ""} looking for talent`}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground border-0 h-11"><Plus className="h-4 w-4 mr-2" /> Post a team</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Looking for teammates?</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2"><Label>Project title *</Label><Input required maxLength={150} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Building a study buddy app for SIH" /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What's the idea, vision, time commitment..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.project_type} onChange={(e) => setForm({ ...form, project_type: e.target.value })}>
                    <option>Hackathon</option><option>Startup</option><option>Research</option><option>Side Project</option><option>Competition</option>
                  </select>
                </div>
                <div className="space-y-2"><Label>Team size</Label><Input type="number" min={2} max={20} value={form.team_size} onChange={(e) => setForm({ ...form, team_size: parseInt(e.target.value) || 4 })} /></div>
              </div>
              <div className="space-y-2"><Label>Skills needed</Label><Input maxLength={200} value={form.skills_needed} onChange={(e) => setForm({ ...form, skills_needed: e.target.value })} placeholder="React, ML, UI design" /></div>
              <div className="space-y-2"><Label>College</Label><Input maxLength={120} value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} placeholder="Open to all colleges" /></div>
              <Button type="submit" disabled={submitting} className="w-full gradient-primary text-primary-foreground border-0">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 bg-card border border-dashed border-border rounded-3xl">
          <div className="h-16 w-16 mx-auto rounded-2xl gradient-warm flex items-center justify-center text-white mb-4 shadow-soft">
            <Users className="h-8 w-8" />
          </div>
          <h3 className="font-display text-xl font-semibold mb-1">No teams posted yet</h3>
          <p className="text-muted-foreground text-sm">Got an idea? Post the first one and rally your crew.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {posts.map((p) => {
            const isOwner = p.user_id === user?.id;
            return (
              <div key={p.id} className="group bg-card border border-border/50 rounded-2xl p-6 hover:shadow-elevated hover:border-primary/30 transition-all flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-12 w-12 rounded-xl gradient-warm flex items-center justify-center text-white shadow-soft group-hover:scale-110 transition-transform shrink-0">
                    <Rocket className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-xl font-semibold leading-tight">{p.title}</h3>
                      <Badge className={p.status === "open" ? "bg-success text-success-foreground shrink-0" : "shrink-0"} variant={p.status === "open" ? "default" : "secondary"}>{p.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">by {p.profiles?.full_name ?? "Student"} · {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</p>
                  </div>
                </div>
                {p.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{p.description}</p>}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {p.project_type && <Badge variant="secondary">{p.project_type}</Badge>}
                  {p.team_size && <Badge variant="outline"><Users className="h-3 w-3 mr-1" />{p.team_size} members</Badge>}
                  {p.college && <Badge variant="outline" className="max-w-[160px] truncate">{p.college}</Badge>}
                </div>
                {p.skills_needed && (
                  <div className="text-sm mb-4 p-3 rounded-xl bg-muted/50 border border-border/50">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
                      <Code2 className="h-3 w-3" /> Skills needed
                    </div>
                    <div className="font-medium">{p.skills_needed}</div>
                  </div>
                )}
                <div className="mt-auto">
                  {!isOwner && (
                    p.has_applied ? (
                      <Button variant="outline" disabled className="w-full">Already applied ✓</Button>
                    ) : (
                      <Button onClick={() => setApplyTo(p)} className="w-full gradient-primary text-primary-foreground border-0 shadow-soft hover:shadow-glow transition-all">
                        <Send className="h-4 w-4 mr-2" /> Send join request
                      </Button>
                    )
                  )}
                  {isOwner && <Badge variant="outline" className="w-full justify-center py-2">Your post — manage in Profile</Badge>}
                  {(isOwner || isAdmin) && (
                    <div className="mt-2 flex justify-end">
                      <DeleteButton table="team_posts" id={p.id} itemLabel="post" onDeleted={load} label="Delete" variant="ghost" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!applyTo} onOpenChange={(v) => !v && setApplyTo(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Join "{applyTo?.title}"</DialogTitle></DialogHeader>
          <form onSubmit={handleApply} className="space-y-4">
            <div className="space-y-2">
              <Label>Message to the team</Label>
              <Textarea maxLength={500} required value={applyMsg} onChange={(e) => setApplyMsg(e.target.value)} placeholder="Hi! I'd love to join because..." rows={5} />
            </div>
            <Button type="submit" disabled={submitting} className="w-full gradient-primary text-primary-foreground border-0">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send request"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TeamStat({ icon: Icon, label, val }: { icon: any; label: string; val: number }) {
  return (
    <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 px-3 py-2.5 text-center min-w-[80px]">
      <Icon className="h-4 w-4 mx-auto mb-1 opacity-90" />
      <div className="font-display text-xl font-bold leading-tight">{val}</div>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
    </div>
  );
}
