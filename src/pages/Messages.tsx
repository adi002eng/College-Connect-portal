import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, MessageSquare, ArrowLeft, User as UserIcon } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string; user1_id: string; user2_id: string; team_post_id: string | null;
  updated_at: string;
  other?: { id: string; full_name: string | null; avatar_url: string | null; college: string | null } | null;
  post?: { title: string } | null;
  lastMessage?: string | null;
}

interface Message { id: string; conversation_id: string; sender_id: string; content: string; created_at: string; }

export default function Messages() {
  const { user } = useAuth();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = convs.find((c) => c.id === activeId);

  const loadConvs = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("conversations").select("*").order("updated_at", { ascending: false });
    if (data) {
      const otherIds = data.map((c) => c.user1_id === user.id ? c.user2_id : c.user1_id);
      const postIds = data.map((c) => c.team_post_id).filter(Boolean) as string[];
      const [{ data: profs }, { data: posts }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, college").in("id", otherIds),
        postIds.length ? supabase.from("team_posts").select("id, title").in("id", postIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      setConvs(data.map((c) => {
        const otherId = c.user1_id === user.id ? c.user2_id : c.user1_id;
        return {
          ...c,
          other: profs?.find((p) => p.id === otherId) ?? null,
          post: c.team_post_id ? posts?.find((p) => p.id === c.team_post_id) ?? null : null,
        };
      }));
    }
    setLoading(false);
  };

  const loadMessages = async (cid: string) => {
    const { data } = await supabase.from("messages").select("*")
      .eq("conversation_id", cid).order("created_at", { ascending: true });
    setMessages(data ?? []);
    // mark unread as read
    if (user && data?.some((m) => !m.sender_id.includes(user.id))) {
      await supabase.from("messages").update({ read: true })
        .eq("conversation_id", cid).neq("sender_id", user.id).eq("read", false);
    }
  };

  useEffect(() => { loadConvs(); }, [user]);

  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId);
    const channel = supabase.channel(`msg:${activeId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${activeId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Realtime conv list refresh
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`conv-list:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => loadConvs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeId || !text.trim()) return;
    setSending(true);
    const content = text.trim();
    setText("");
    const { error } = await supabase.from("messages").insert({
      conversation_id: activeId, sender_id: user.id, content,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      setText(content);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] bg-card border border-border rounded-2xl overflow-hidden flex">
      {/* Conversation list */}
      <aside className={cn(
        "w-full md:w-80 border-r border-border flex-col min-h-0",
        activeId ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b border-border shrink-0">
          <h2 className="font-display text-xl font-bold">💬 Messages</h2>
          <p className="text-xs text-muted-foreground mt-1">Chats start when applications are accepted</p>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : convs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
              No conversations yet
            </div>
          ) : convs.map((c) => (
            <button key={c.id} onClick={() => setActiveId(c.id)}
              className={cn(
                "w-full text-left p-3 border-b border-border/50 flex gap-3 hover:bg-muted transition-colors",
                activeId === c.id && "bg-muted"
              )}>
              <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground shrink-0">
                {c.other?.avatar_url ? <img src={c.other.avatar_url} alt="" className="h-full w-full rounded-full object-cover" /> : <UserIcon className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{c.other?.full_name ?? "Student"}</div>
                {c.post && <div className="text-xs text-primary truncate">📌 {c.post.title}</div>}
                <div className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}</div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Chat panel */}
      <section className={cn(
        "flex-1 flex-col min-h-0 min-w-0",
        activeId ? "flex" : "hidden md:flex"
      )}>
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
            <MessageSquare className="h-16 w-16 mb-4 opacity-30" />
            <p>Select a conversation to start chatting</p>
          </div>
        ) : (
          <>
            <header className="p-4 border-b border-border flex items-center gap-3 shrink-0">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setActiveId(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground">
                {active.other?.avatar_url ? <img src={active.other.avatar_url} alt="" className="h-full w-full rounded-full object-cover" /> : <UserIcon className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{active.other?.full_name ?? "Student"}</div>
                {active.other?.college && <div className="text-xs text-muted-foreground truncate">{active.other.college}</div>}
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
              {messages.map((m, i) => {
                const mine = m.sender_id === user?.id;
                const showTime = i === 0 || (new Date(m.created_at).getTime() - new Date(messages[i-1].created_at).getTime()) > 5*60*1000;
                return (
                  <div key={m.id}>
                    {showTime && (
                      <div className="text-center text-[10px] text-muted-foreground my-3">
                        {format(new Date(m.created_at), "PPp")}
                      </div>
                    )}
                    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[75%] px-3 py-2 rounded-2xl text-sm break-words",
                        mine
                          ? "gradient-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      )}>
                        {m.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={send} className="p-3 border-t border-border flex gap-2 shrink-0 bg-card">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message..."
                maxLength={2000}
                autoFocus
                className="flex-1"
              />
              <Button type="submit" disabled={sending || !text.trim()} className="gradient-primary text-primary-foreground border-0 shrink-0">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
