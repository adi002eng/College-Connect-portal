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
import { Users, Plus, Loader2, Send } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">🚀 Team Finder</h1>
          <p className="text-muted-foreground mt-1">Find teammates for your next big thing</p>
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
        <div className="text-center py-16 text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-3 opacity-40" />No team posts yet</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {posts.map((p) => {
            const isOwner = p.user_id === user?.id;
            return (
              <div key={p.id} className="bg-card border border-border/50 rounded-2xl p-6 hover:shadow-elevated transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-display text-xl font-semibold">{p.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">by {p.profiles?.full_name ?? "Student"} · {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</p>
                  </div>
                  <Badge className={p.status === "open" ? "bg-success text-success-foreground" : ""} variant={p.status === "open" ? "default" : "secondary"}>{p.status}</Badge>
                </div>
                {p.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{p.description}</p>}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {p.project_type && <Badge variant="secondary">{p.project_type}</Badge>}
                  {p.team_size && <Badge variant="outline">{p.team_size} members</Badge>}
                  {p.college && <Badge variant="outline">{p.college}</Badge>}
                </div>
                {p.skills_needed && (
                  <div className="text-sm mb-4"><span className="text-muted-foreground">Skills: </span><span className="font-medium">{p.skills_needed}</span></div>
                )}
                {!isOwner && (
                  p.has_applied ? (
                    <Button variant="outline" disabled className="w-full">Already applied ✓</Button>
                  ) : (
                    <Button onClick={() => setApplyTo(p)} className="w-full gradient-primary text-primary-foreground border-0">
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
