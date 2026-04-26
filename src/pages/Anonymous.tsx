import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, MessageCircleQuestion, Loader2, Send, Eye, Shield, Sparkles, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRole } from "@/hooks/useRole";
import { DeleteButton } from "@/components/DeleteButton";

interface Question {
  id: string; user_id: string; content: string; category: string | null; created_at: string;
}
interface Answer {
  id: string; question_id: string; user_id: string; content: string; created_at: string;
}

const anonAvatar = (id: string) => {
  const animals = ["🦊", "🐼", "🦄", "🐙", "🦉", "🐢", "🦋", "🐳", "🦅", "🐯"];
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return animals[h % animals.length];
};
const anonName = (id: string) => {
  const adj = ["Curious", "Silent", "Brave", "Quirky", "Wise", "Bold", "Hidden", "Shy"];
  const n = ["Owl", "Fox", "Panda", "Wolf", "Tiger", "Crane", "Otter", "Hawk"];
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `${adj[h % adj.length]} ${n[(h >> 3) % n.length]}`;
};

export default function Anonymous() {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ content: "", category: "General" });
  const [viewing, setViewing] = useState<Question | null>(null);
  const [reply, setReply] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");

  const CATEGORIES = ["All", "General", "Academics", "Career", "Mental Health", "Relationships", "Confessions"];

  const load = async () => {
    setLoading(true);
    const { data: qs } = await supabase.from("anon_questions").select("*").order("created_at", { ascending: false });
    if (qs) {
      setQuestions(qs);
      const { data: ans } = await supabase.from("anon_answers").select("*").in("question_id", qs.map((q) => q.id)).order("created_at", { ascending: true });
      const grouped: Record<string, Answer[]> = {};
      (ans ?? []).forEach((a) => { (grouped[a.question_id] ||= []).push(a); });
      setAnswers(grouped);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.content.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("anon_questions").insert({ user_id: user.id, content: form.content, category: form.category });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Question posted anonymously!");
    setOpen(false); setForm({ content: "", category: "General" });
    load();
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !viewing || !reply.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("anon_answers").insert({ question_id: viewing.id, user_id: user.id, content: reply });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Reply sent!"); setReply("");
    load();
  };

  const totalReplies = Object.values(answers).reduce((sum, a) => sum + a.length, 0);
  const filteredQs = activeCat === "All" ? questions : questions.filter((q) => (q.category ?? "General") === activeCat);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-3xl p-6 md:p-10 text-white relative overflow-hidden shadow-elevated" style={{ background: "linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--primary)))" }}>
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -left-10 -bottom-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur px-3 py-1 text-xs font-medium mb-3">
              <Shield className="h-3.5 w-3.5" /> 100% anonymous · zero judgment
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">🎭 Anonymous Zone</h1>
            <p className="text-white/90 max-w-xl">Speak freely. Your identity stays hidden behind a friendly animal avatar.</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 px-4 py-3 text-center min-w-[90px]">
              <MessageCircleQuestion className="h-4 w-4 mx-auto mb-1 opacity-90" />
              <div className="font-display text-2xl font-bold leading-tight">{questions.length}</div>
              <div className="text-[10px] uppercase tracking-wide opacity-80">Questions</div>
            </div>
            <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 px-4 py-3 text-center min-w-[90px]">
              <MessageSquare className="h-4 w-4 mx-auto mb-1 opacity-90" />
              <div className="font-display text-2xl font-bold leading-tight">{totalReplies}</div>
              <div className="text-[10px] uppercase tracking-wide opacity-80">Replies</div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" /> A safe space — be kind, stay real.
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground border-0 h-11"><Plus className="h-4 w-4 mr-2" /> Ask anonymously</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ask anonymously</DialogTitle></DialogHeader>
            <form onSubmit={handleAsk} className="space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option>General</option><option>Academics</option><option>Career</option><option>Mental Health</option><option>Relationships</option><option>Confessions</option>
                </select>
              </div>
              <div className="space-y-2"><Label>Your question</Label><Textarea required maxLength={1000} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="What's on your mind?" rows={5} /></div>
              <p className="text-xs text-muted-foreground">🔒 Your identity is hidden. You'll appear as a random animal name.</p>
              <Button type="submit" disabled={submitting} className="w-full gradient-primary text-primary-foreground border-0">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post anonymously"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : questions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><MessageCircleQuestion className="h-12 w-12 mx-auto mb-3 opacity-40" />Be the first to ask</div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id} className="bg-card border border-border/50 rounded-2xl p-5 hover:shadow-soft transition-all">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-2xl gradient-card flex items-center justify-center text-2xl shrink-0">{anonAvatar(q.user_id)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm">{anonName(q.user_id)}</span>
                    {q.category && <Badge variant="secondary" className="text-xs">{q.category}</Badge>}
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}</span>
                  </div>
                  <p className="text-foreground whitespace-pre-wrap break-words">{q.content}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <Button variant="ghost" size="sm" onClick={() => setViewing(q)}>
                      <Eye className="h-4 w-4 mr-1.5" /> {(answers[q.id]?.length ?? 0)} {(answers[q.id]?.length ?? 0) === 1 ? "reply" : "replies"}
                    </Button>
                    {(q.user_id === user?.id || isAdmin) && (
                      <DeleteButton table="anon_questions" id={q.id} itemLabel="question" onDeleted={load} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Anonymous discussion</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="bg-muted/50 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-9 w-9 rounded-xl gradient-card flex items-center justify-center text-lg">{anonAvatar(viewing.user_id)}</div>
                  <span className="font-semibold text-sm">{anonName(viewing.user_id)}</span>
                </div>
                <p className="whitespace-pre-wrap">{viewing.content}</p>
              </div>
              <div className="space-y-2">
                {(answers[viewing.id] ?? []).map((a) => (
                  <div key={a.id} className="border border-border/50 rounded-xl p-3 flex gap-3">
                    <div className="h-8 w-8 rounded-lg gradient-card flex items-center justify-center text-base shrink-0">{anonAvatar(a.user_id)}</div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold mb-0.5">{anonName(a.user_id)}</div>
                      <p className="text-sm whitespace-pre-wrap">{a.content}</p>
                    </div>
                    {(a.user_id === user?.id || isAdmin) && (
                      <DeleteButton table="anon_answers" id={a.id} itemLabel="reply" onDeleted={load} />
                    )}
                  </div>
                ))}
              </div>
              <form onSubmit={handleReply} className="space-y-2 sticky bottom-0 bg-background pt-2">
                <Textarea required maxLength={500} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Share your thoughts anonymously..." rows={3} />
                <Button type="submit" disabled={submitting} className="w-full gradient-primary text-primary-foreground border-0">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Reply</>}
                </Button>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
