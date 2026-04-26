import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BookOpen,
  Calendar,
  Users,
  MessageCircleQuestion,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Lightbulb,
  Rocket,
  Trophy,
  GraduationCap,
  Mail,
  Github,
  Twitter,
  Linkedin,
  Instagram,
  Heart,
  Zap,
  Target,
} from "lucide-react";

const sections = [
  { to: "/app/notes", icon: BookOpen, title: "Notes", desc: "Browse & upload study material", grad: "gradient-primary" },
  { to: "/app/events", icon: Calendar, title: "Events", desc: "Find hackathons, fests & meetups", grad: "gradient-accent" },
  { to: "/app/teams", icon: Users, title: "Team Finder", desc: "Build your dream team", grad: "gradient-warm" },
  { to: "/app/anonymous", icon: MessageCircleQuestion, title: "Anonymous Zone", desc: "Ask anything, no judgment", grad: "gradient-primary" },
];

const tips = [
  { icon: Lightbulb, title: "Upload your first note", desc: "Help juniors and earn community love.", color: "text-accent" },
  { icon: Rocket, title: "Join a hackathon", desc: "Check Events for upcoming campus battles.", color: "text-primary" },
  { icon: Target, title: "Find a teammate", desc: "Post in Team Finder and build something cool.", color: "text-secondary" },
];

const highlights = [
  { icon: TrendingUp, label: "Trending", value: "Hackathons", grad: "gradient-primary" },
  { icon: Trophy, label: "Top contributor", value: "Be the next one", grad: "gradient-warm" },
  { icon: Zap, label: "Quick action", value: "Share notes", grad: "gradient-accent" },
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
      {/* Hero */}
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

      {/* Stats */}
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

      {/* Highlights strip */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {highlights.map((h) => (
          <div key={h.label} className="bg-card border border-border/50 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-elevated transition-all">
            <div className={`h-12 w-12 rounded-xl ${h.grad} flex items-center justify-center text-white shadow-soft`}>
              <h.icon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{h.label}</div>
              <div className="font-display text-lg font-semibold">{h.value}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Explore */}
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

      {/* Tips for you */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-bold">Tips for you</h2>
          <span className="text-xs text-muted-foreground">Curated for students</span>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {tips.map((t) => (
            <div key={t.title} className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-elevated transition-all">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3">
                <t.icon className={`h-5 w-5 ${t.color}`} />
              </div>
              <h3 className="font-display font-semibold mb-1">{t.title}</h3>
              <p className="text-sm text-muted-foreground">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA card */}
      <section className="rounded-3xl bg-card border border-border/50 p-8 md:p-10 shadow-sm relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full gradient-accent opacity-20 blur-3xl" />
        <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium mb-3">
              <Heart className="h-3.5 w-3.5 text-primary" /> Give back to your campus
            </div>
            <h3 className="font-display text-2xl md:text-3xl font-bold mb-2">Share something today</h3>
            <p className="text-muted-foreground max-w-xl">
              Upload notes, post an event, or help a junior in the Anonymous Zone. Small acts, big impact.
            </p>
          </div>
          <Link
            to="/app/notes"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl gradient-primary text-primary-foreground font-medium shadow-soft hover:shadow-glow transition-all"
          >
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer (full-bleed inside container) */}
      <footer className="-mx-4 md:-mx-8 mt-6 border-t border-border/50 bg-muted/30">
        <div className="container py-12">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 font-display font-bold text-lg mb-3">
                <div className="h-9 w-9 rounded-xl gradient-hero flex items-center justify-center text-white">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <span className="text-gradient">EduSphere</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Bridging campuses across India. Connect, collaborate and grow with students from every college.
              </p>
              <div className="flex gap-2 mt-4">
                {[
                  { icon: Twitter, href: "#" },
                  { icon: Instagram, href: "#" },
                  { icon: Linkedin, href: "#" },
                  { icon: Github, href: "#" },
                ].map((s, i) => (
                  <a
                    key={i}
                    href={s.href}
                    className="h-9 w-9 rounded-lg bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
                    aria-label="Social link"
                  >
                    <s.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-display font-semibold mb-4">Explore</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/app/notes" className="text-muted-foreground hover:text-primary transition-colors">Notes</Link></li>
                <li><Link to="/app/events" className="text-muted-foreground hover:text-primary transition-colors">Events</Link></li>
                <li><Link to="/app/teams" className="text-muted-foreground hover:text-primary transition-colors">Team Finder</Link></li>
                <li><Link to="/app/anonymous" className="text-muted-foreground hover:text-primary transition-colors">Anonymous Zone</Link></li>
                <li><Link to="/app/messages" className="text-muted-foreground hover:text-primary transition-colors">Messages</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-display font-semibold mb-4">Account</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/app/profile" className="text-muted-foreground hover:text-primary transition-colors">My Profile</Link></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Settings</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Notifications</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Privacy</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-display font-semibold mb-4">Resources</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Help Center</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Community Guidelines</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Terms of Service</a></li>
                <li>
                  <a href="mailto:hello@edusphere.app" className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> hello@edusphere.app
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
            <div>© {new Date().getFullYear()} EduSphere — Made with 💜 for students</div>
            <div className="flex gap-5">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
              <a href="#" className="hover:text-primary transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
