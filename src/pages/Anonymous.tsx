import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, MessageCircleQuestion, Loader2, Send, Eye } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">🎭 Anonymous Zone</h1>
          <p className="text-muted-foreground mt-1">Ask anything. No names. No judgment.</p>
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
