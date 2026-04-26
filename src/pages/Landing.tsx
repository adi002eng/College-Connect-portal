import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar, Users, MessageCircleQuestion, GraduationCap, Sparkles, ArrowRight, Quote, Mail, Github, Twitter, Linkedin, Instagram } from "lucide-react";

const features = [
  { icon: BookOpen, title: "Share Notes", desc: "Upload and download study material across campuses.", grad: "gradient-primary" },
  { icon: Calendar, title: "Discover Events", desc: "Hackathons, fests, workshops — never miss a beat.", grad: "gradient-accent" },
  { icon: Users, title: "Find Your Team", desc: "Build squads for projects, startups & competitions.", grad: "gradient-warm" },
  { icon: MessageCircleQuestion, title: "Anonymous Zone", desc: "Ask anything. Speak freely. Stay anonymous.", grad: "gradient-primary" },
];

const testimonials = [
  {
    name: "Ananya Sharma",
    role: "CSE Student, WIT Dehradun",
    quote: "EduSphere helped me find my hackathon team in 2 days. We ended up winning third place at our college fest!",
    initials: "AS",
    grad: "gradient-primary",
  },
  {
    name: "Rohan Verma",
    role: "ECE Student, THDC IHET",
    quote: "The notes section is gold. I cleared my semester thanks to seniors who shared their handwritten material here.",
    initials: "RV",
    grad: "gradient-accent",
  },
  {
    name: "Prof. Meera Joshi",
    role: "Faculty, Tula's Institute",
    quote: "Posting events is effortless. My workshop reached students from 6 different colleges within hours.",
    initials: "MJ",
    grad: "gradient-warm",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-2 font-display font-bold text-xl">
          <div className="h-10 w-10 rounded-2xl gradient-hero flex items-center justify-center text-white shadow-soft">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-gradient">EduSphere</span>
        </div>
        <div className="flex gap-2">
          <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
          <Link to="/auth"><Button className="gradient-primary text-primary-foreground border-0 shadow-soft hover:shadow-glow transition-all">Get started</Button></Link>
        </div>
      </header>

      {/* Hero */}
      <section className="container relative py-20 md:py-32 text-center">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-primary/30 blur-3xl animate-float" />
          <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-secondary/30 blur-3xl animate-float" style={{ animationDelay: "2s" }} />
          <div className="absolute top-40 right-1/3 h-64 w-64 rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "4s" }} />
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-sm font-medium mb-8 animate-fade-in">
          <Sparkles className="h-4 w-4 text-primary" />
          Built for students, by students
        </div>

        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.05] mb-6 animate-fade-in">
          Connect with students <br />
          across <span className="text-gradient">every campus</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in">
          Share notes, find teammates, discover events, and ask anything anonymously.
          Your college bubble just got bigger.
        </p>

        <div className="flex flex-wrap gap-3 justify-center animate-fade-in">
          <Link to="/auth">
            <Button size="lg" className="gradient-primary text-primary-foreground border-0 shadow-soft hover:shadow-glow text-base h-12 px-8 transition-all">
              Join the community <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="lg" variant="outline" className="text-base h-12 px-8">
              I already have an account
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group p-6 rounded-3xl bg-card border border-border/50 hover:border-primary/30 shadow-sm hover:shadow-elevated transition-all hover:-translate-y-1"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className={`h-14 w-14 rounded-2xl ${f.grad} flex items-center justify-center text-white mb-4 shadow-soft group-hover:scale-110 transition-transform`}>
                <f.icon className="h-7 w-7" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20">
        <div className="rounded-[2.5rem] gradient-hero p-12 md:p-20 text-center text-white relative overflow-hidden shadow-elevated">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          <div className="relative">
            <h2 className="font-display text-4xl md:text-6xl font-bold mb-4">Ready to connect?</h2>
            <p className="text-lg md:text-xl text-white/90 mb-8 max-w-xl mx-auto">
              Join thousands of students already collaborating across colleges.
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="text-base h-12 px-8 bg-white text-primary hover:bg-white/90">
                Create your free account <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container py-20">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-sm font-medium mb-4">
            <Quote className="h-4 w-4 text-primary" /> Loved by students & faculty
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-3">
            Real stories from <span className="text-gradient">real campuses</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Hear what students and educators across India are saying about EduSphere.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="group p-7 rounded-3xl bg-card border border-border/50 hover:border-primary/30 shadow-sm hover:shadow-elevated transition-all hover:-translate-y-1 flex flex-col"
            >
              <Quote className="h-8 w-8 text-primary/40 mb-4" />
              <p className="text-foreground/90 leading-relaxed mb-6 flex-1">"{t.quote}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                <div className={`h-11 w-11 rounded-full ${t.grad} flex items-center justify-center text-white font-semibold shadow-soft`}>
                  {t.initials}
                </div>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-muted/30 mt-10">
        <div className="container py-14">
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
                <li><Link to="/auth" className="text-muted-foreground hover:text-primary transition-colors">Notes</Link></li>
                <li><Link to="/auth" className="text-muted-foreground hover:text-primary transition-colors">Events</Link></li>
                <li><Link to="/auth" className="text-muted-foreground hover:text-primary transition-colors">Team Finder</Link></li>
                <li><Link to="/auth" className="text-muted-foreground hover:text-primary transition-colors">Anonymous Zone</Link></li>
                <li><Link to="/auth" className="text-muted-foreground hover:text-primary transition-colors">Messages</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-display font-semibold mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">About us</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Careers</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Blog</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Contact</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">For Colleges</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-display font-semibold mb-4">Resources</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Help Center</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Community Guidelines</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Terms of Service</a></li>
                <li>
                  <a href="mailto:hello@edusphere.app" className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> hello@edusphere.app
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
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
