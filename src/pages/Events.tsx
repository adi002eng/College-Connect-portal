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
import { Calendar, Plus, MapPin, Loader2, Lock } from "lucide-react";
import { format } from "date-fns";
import { useRole } from "@/hooks/useRole";

interface Event {
  id: string; user_id: string; title: string; description: string | null;
  college: string | null; location: string | null; event_date: string | null; category: string | null;
  created_at: string;
  profiles?: { full_name: string | null } | null;
}

export default function Events() {
  const { user } = useAuth();
  const { isStaff, isPendingStaff, loading: roleLoading } = useRole();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", college: "", location: "", event_date: "", category: "Hackathon" });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("events").select("*").order("event_date", { ascending: true, nullsFirst: false });
    if (data) {
      const userIds = [...new Set(data.map((e) => e.user_id))];
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      setEvents(data.map((e) => ({ ...e, profiles: profs?.find((p) => p.id === e.user_id) ?? null })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.title.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("events").insert({
      user_id: user.id,
      title: form.title,
      description: form.description || null,
      college: form.college || null,
      location: form.location || null,
      event_date: form.event_date ? new Date(form.event_date).toISOString() : null,
      category: form.category,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Event posted!");
    setOpen(false);
    setForm({ title: "", description: "", college: "", location: "", event_date: "", category: "Hackathon" });
    load();
  };

  const catColor = (c: string | null) => {
    switch (c) {
      case "Hackathon": return "gradient-primary";
      case "Workshop": return "gradient-accent";
      case "Fest": return "gradient-warm";
      default: return "bg-muted";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">🎉 Campus Events</h1>
          <p className="text-muted-foreground mt-1">Hackathons, fests, workshops · auto-removed after they happen</p>
        </div>
        {roleLoading ? null : isStaff ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground border-0 h-11"><Plus className="h-4 w-4 mr-2" /> Post event</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Post an event</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Title *</Label><Input required maxLength={150} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>College</Label><Input maxLength={120} value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} /></div>
                <div className="space-y-2"><Label>Location</Label><Input maxLength={120} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Date & time</Label><Input type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option>Hackathon</option><option>Workshop</option><option>Fest</option><option>Meetup</option><option>Other</option>
                  </select>
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full gradient-primary text-primary-foreground border-0">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2.5 rounded-xl border border-border">
            <Lock className="h-4 w-4" />
            {isPendingStaff ? "Staff verification pending — wait for admin approval to post events." : "Only verified staff can post events."}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><Calendar className="h-12 w-12 mx-auto mb-3 opacity-40" />No events yet</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((e) => (
            <div key={e.id} className="bg-card border border-border/50 rounded-2xl overflow-hidden hover:shadow-elevated transition-all hover:-translate-y-0.5">
              <div className={`h-2 ${catColor(e.category)}`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-display text-lg font-semibold line-clamp-2">{e.title}</h3>
                  {e.category && <Badge variant="secondary">{e.category}</Badge>}
                </div>
                {e.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{e.description}</p>}
                <div className="space-y-1.5 text-sm">
                  {e.event_date && <div className="flex items-center gap-2 text-foreground"><Calendar className="h-4 w-4 text-primary" />{format(new Date(e.event_date), "PPp")}</div>}
                  {e.location && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" />{e.location}</div>}
                  {e.college && <div className="text-xs text-muted-foreground">📍 {e.college}</div>}
                </div>
                <div className="text-xs text-muted-foreground border-t border-border/50 pt-3 mt-3">
                  Posted by {e.profiles?.full_name ?? "Student"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
