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
import { Calendar, Plus, MapPin, Loader2, Lock, Sparkles, Clock, Users as UsersIcon, GraduationCap } from "lucide-react";
import { format } from "date-fns";
import { useRole } from "@/hooks/useRole";
import { DeleteButton } from "@/components/DeleteButton";

interface Event {
  id: string; user_id: string; title: string; description: string | null;
  college: string | null; location: string | null; event_date: string | null; category: string | null;
  created_at: string;
  profiles?: { full_name: string | null } | null;
}

export default function Events() {
  const { user } = useAuth();
  const { isStaff, isPendingStaff, isAdmin, loading: roleLoading } = useRole();
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

  const upcomingCount = events.filter((e) => e.event_date && new Date(e.event_date) > new Date()).length;
  const collegeCount = new Set(events.map((e) => e.college).filter(Boolean)).size;
  const hackCount = events.filter((e) => e.category === "Hackathon").length;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-3xl p-6 md:p-10 text-white relative overflow-hidden shadow-elevated" style={{ background: "linear-gradient(135deg, hsl(var(--accent)), hsl(var(--primary)))" }}>
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -left-10 -bottom-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur px-3 py-1 text-xs font-medium mb-3">
              <Sparkles className="h-3.5 w-3.5" /> What's happening on campus
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">🎉 Campus Events</h1>
            <p className="text-white/90 max-w-xl">Hackathons, fests, workshops · auto-removed after they happen.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <EventStat icon={Clock} label="Upcoming" val={upcomingCount} />
            <EventStat icon={GraduationCap} label="Colleges" val={collegeCount} />
            <EventStat icon={UsersIcon} label="Hackathons" val={hackCount} />
          </div>
        </div>
      </section>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{events.length}</span> event{events.length === 1 ? "" : "s"}
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
        <div className="text-center py-20 bg-card border border-dashed border-border rounded-3xl">
          <div className="h-16 w-16 mx-auto rounded-2xl gradient-accent flex items-center justify-center text-white mb-4 shadow-soft">
            <Calendar className="h-8 w-8" />
          </div>
          <h3 className="font-display text-xl font-semibold mb-1">No events yet</h3>
          <p className="text-muted-foreground text-sm">Check back soon — campus magic is brewing.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((e) => {
            const isUpcoming = e.event_date && new Date(e.event_date) > new Date();
            return (
              <div key={e.id} className="group bg-card border border-border/50 rounded-2xl overflow-hidden hover:shadow-elevated hover:border-primary/30 transition-all hover:-translate-y-0.5 flex flex-col">
                <div className={`h-1.5 ${catColor(e.category)}`} />
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className={`h-11 w-11 rounded-xl ${catColor(e.category)} flex items-center justify-center text-white shadow-soft group-hover:scale-110 transition-transform`}>
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {e.category && <Badge variant="secondary">{e.category}</Badge>}
                      {isUpcoming && <Badge className="bg-success text-success-foreground text-[10px]">Upcoming</Badge>}
                    </div>
                  </div>
                  <h3 className="font-display text-lg font-semibold line-clamp-2 mb-1">{e.title}</h3>
                  {e.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{e.description}</p>}
                  <div className="space-y-1.5 text-sm mt-auto">
                    {e.event_date && (
                      <div className="flex items-center gap-2 text-foreground">
                        <Clock className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate">{format(new Date(e.event_date), "PPp")}</span>
                      </div>
                    )}
                    {e.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{e.location}</span>
                      </div>
                    )}
                    {e.college && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{e.college}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-3 mt-3">
                    <span className="flex items-center gap-1.5">
                      <span className="h-5 w-5 rounded-full gradient-primary flex items-center justify-center text-white text-[10px] font-semibold">
                        {(e.profiles?.full_name ?? "S")[0].toUpperCase()}
                      </span>
                      {e.profiles?.full_name ?? "Student"}
                    </span>
                    {(e.user_id === user?.id || isAdmin) && (
                      <DeleteButton table="events" id={e.id} itemLabel="event" onDeleted={load} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EventStat({ icon: Icon, label, val }: { icon: any; label: string; val: number }) {
  return (
    <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 px-3 py-2.5 text-center min-w-[80px]">
      <Icon className="h-4 w-4 mx-auto mb-1 opacity-90" />
      <div className="font-display text-xl font-bold leading-tight">{val}</div>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
    </div>
  );
}

