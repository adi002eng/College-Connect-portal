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
import { BookOpen, Plus, FileText, Download, Search, Loader2, Sparkles, GraduationCap, FolderOpen, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRole } from "@/hooks/useRole";
import { DeleteButton } from "@/components/DeleteButton";

interface Note {
  id: string; user_id: string; title: string; description: string | null;
  subject: string | null; college: string | null; file_url: string | null; file_name: string | null;
  created_at: string;
  profiles?: { full_name: string | null; college: string | null } | null;
}

export default function Notes() {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ title: "", description: "", subject: "", college: "" });
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("notes").select("*").order("created_at", { ascending: false });
    if (data) {
      const userIds = [...new Set(data.map((n) => n.user_id))];
      const { data: profs } = await supabase.from("profiles").select("id, full_name, college").in("id", userIds);
      setNotes(data.map((n) => ({ ...n, profiles: profs?.find((p) => p.id === n.user_id) ?? null })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.title.trim()) return;
    setSubmitting(true);
    let file_url: string | null = null;
    let file_name: string | null = null;
    if (file) {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("notes").upload(path, file);
      if (upErr) { setSubmitting(false); return toast.error(upErr.message); }
      const { data: pub } = supabase.storage.from("notes").getPublicUrl(path);
      file_url = pub.publicUrl; file_name = file.name;
    }
    const { error } = await supabase.from("notes").insert({
      user_id: user.id, title: form.title, description: form.description || null,
      subject: form.subject || null, college: form.college || null, file_url, file_name,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Note shared!");
    setOpen(false);
    setForm({ title: "", description: "", subject: "", college: "" });
    setFile(null);
    load();
  };

  const filtered = notes.filter((n) => {
    const q = search.toLowerCase();
    return !q || n.title.toLowerCase().includes(q) || (n.subject ?? "").toLowerCase().includes(q) || (n.college ?? "").toLowerCase().includes(q);
  });

  const uniqueSubjects = new Set(notes.map((n) => n.subject).filter(Boolean)).size;
  const uniqueColleges = new Set(notes.map((n) => n.college).filter(Boolean)).size;
  const uniqueContributors = new Set(notes.map((n) => n.user_id)).size;

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <section className="rounded-3xl gradient-primary p-6 md:p-10 text-white relative overflow-hidden shadow-elevated">
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -left-10 -bottom-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur px-3 py-1 text-xs font-medium mb-3">
              <Sparkles className="h-3.5 w-3.5" /> Study smarter, together
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">📚 Notes Library</h1>
            <p className="text-white/90 max-w-xl">Curated study material shared by students across every campus.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <Stat icon={FileText} label="Notes" val={notes.length} />
            <Stat icon={FolderOpen} label="Subjects" val={uniqueSubjects} />
            <Stat icon={User} label="Sharers" val={uniqueContributors} />
          </div>
        </div>
      </section>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          {uniqueColleges > 0 ? `Material from ${uniqueColleges} college${uniqueColleges > 1 ? "s" : ""}` : "Be the first to contribute"}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground border-0 h-11"><Plus className="h-4 w-4 mr-2" /> Share notes</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Share study notes</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Title *</Label><Input required maxLength={150} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="DBMS Unit 3 — Normalization" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Subject</Label><Input maxLength={80} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="DBMS" /></div>
                <div className="space-y-2"><Label>College</Label><Input maxLength={120} value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} placeholder="IIT Delhi" /></div>
              </div>
              <div className="space-y-2"><Label>Description</Label><Textarea maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief summary..." /></div>
              <div className="space-y-2"><Label>File (PDF, image, doc)</Label><Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
              <Button type="submit" disabled={submitting} className="w-full gradient-primary text-primary-foreground border-0">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Share"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10 h-11" placeholder="Search by title, subject or college..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
          No notes yet. Be the first to share!
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((n) => (
            <div key={n.id} className="bg-card border border-border/50 rounded-2xl p-5 hover:shadow-elevated transition-all hover:-translate-y-0.5">
              <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center text-white mb-3"><FileText className="h-6 w-6" /></div>
              <h3 className="font-display text-lg font-semibold mb-1 line-clamp-2">{n.title}</h3>
              {n.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{n.description}</p>}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {n.subject && <Badge variant="secondary">{n.subject}</Badge>}
                {n.college && <Badge variant="outline">{n.college}</Badge>}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-3">
                <span>by {n.profiles?.full_name ?? "Student"}</span>
                <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                {n.file_url && (
                  <a href={n.file_url} target="_blank" rel="noreferrer" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full"><Download className="h-3.5 w-3.5 mr-2" /> Download</Button>
                  </a>
                )}
                {(n.user_id === user?.id || isAdmin) && (
                  <DeleteButton table="notes" id={n.id} itemLabel="note" onDeleted={load} variant="outline" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
