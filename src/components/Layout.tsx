import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar, Users, MessageCircleQuestion, User as UserIcon, LogOut, GraduationCap, Menu, X, MessageSquare, Home as HomeIcon, Shield } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import NotificationBell from "./NotificationBell";
import { useRole } from "@/hooks/useRole";

const baseLinks = [
  { to: "/app", label: "Home", icon: HomeIcon, end: true },
  { to: "/app/notes", label: "Notes", icon: BookOpen },
  { to: "/app/events", label: "Events", icon: Calendar },
  { to: "/app/teams", label: "Teams", icon: Users },
  { to: "/app/messages", label: "Messages", icon: MessageSquare },
  { to: "/app/anonymous", label: "Anonymous", icon: MessageCircleQuestion },
  { to: "/app/profile", label: "Profile", icon: UserIcon },
];

export default function Layout() {
  const { signOut } = useAuth();
  const { isAdmin } = useRole();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const links = useMemo(
    () => (isAdmin ? [...baseLinks, { to: "/app/admin", label: "Admin", icon: Shield }] : baseLinks),
    [isAdmin]
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <NavLink to="/app" className="flex items-center gap-2 font-display font-bold text-lg">
            <div className="h-9 w-9 rounded-xl gradient-hero flex items-center justify-center text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-gradient">CollegeConnect</span>
          </NavLink>

          <nav className="hidden lg:flex items-center gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                    isActive
                      ? "gradient-primary text-primary-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )
                }
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-1">
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>

          <div className="lg:hidden flex items-center gap-1">
            <NotificationBell />
            <button className="p-2" onClick={() => setOpen(!open)} aria-label="Menu">
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {open && (
          <nav className="lg:hidden border-t border-border/50 p-4 space-y-1 animate-fade-in">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3",
                    isActive ? "gradient-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                  )
                }
              >
                <l.icon className="h-4 w-4" /> {l.label}
              </NavLink>
            ))}
            <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </nav>
        )}
      </header>

      <main className="flex-1 container py-8 animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}
