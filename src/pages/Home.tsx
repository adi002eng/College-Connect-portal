import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, Calendar, Users, MessageCircleQuestion, ArrowRight, Sparkles } from "lucide-react";

const sections = [
  { to: "/app/notes", icon: BookOpen, title: "Notes", desc: "Browse & upload study material", grad: "gradient-primary" },
  { to: "/app/events", icon: Calendar, title: "Events", desc: "Find hackathons, fests & meetups", grad: "gradient-accent" },
  { to: "/app/teams", icon: Users, title: "Team Finder", desc: "Build your dream team", grad: "gradient-warm" },
  { to: "/app/anonymous", icon: MessageCircleQuestion, title: "Anonymous Zone", desc: "Ask anything, no judgment", grad: "gradient-primary" },
];

export default function Home() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [stats, setStats] = useState({ notes: 0, events: 0, teams: 0, questions: 0 });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setName(data?.full_name?.split(" ")[0] ?? "friend"));

    Promise.all([
      supabase.from("notes").select("*", { count: "exact", head: true }),
      supabase.from("events").select("*", { count: "exact", head: true }),
      supabase.from("team_posts").select("*", { count: "exact", head: true }),
      supabase.from("anon_questions").select("*", { count: "exact", head: true }),
    ]).then(([n, e, t, q]) => setStats({
      notes: n.count ?? 0, events: e.count ?? 0, teams: t.count ?? 0, questions: q.count ?? 0,
    }));
  }, [user]);

  return (
    <div className="space-y-10">
      <section className="rounded-3xl gradient-hero p-8 md:p-12 text-white relative overflow-hidden shadow-elevated">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur px-3 py-1 text-xs font-medium mb-4">
            <Sparkles className="h-3.5 w-3.5" /> Welcome back
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">Hey {name} 👋</h1>
          <p className="text-white/90 text-lg max-w-xl">Your campus community is buzzing. Jump into something good.</p>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Notes shared", val: stats.notes },
          { label: "Events live", val: stats.events },
          { label: "Teams hiring", val: stats.teams },
          { label: "Questions asked", val: stats.questions },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
            <div className="text-3xl font-display font-bold text-gradient">{s.val}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold mb-4">Explore</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {sections.map((s) => (
            <Link key={s.to} to={s.to} className="group bg-card border border-border/50 rounded-3xl p-6 flex items-center gap-5 hover:border-primary/40 hover:shadow-elevated transition-all hover:-translate-y-0.5">
              <div className={`h-14 w-14 rounded-2xl ${s.grad} flex items-center justify-center text-white shadow-soft group-hover:scale-110 transition-transform`}>
                <s.icon className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
