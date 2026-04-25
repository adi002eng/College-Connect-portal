import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "staff" | "student" | "pending_staff" | "banned";

export function useRole() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) {
        setRoles([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (active) {
        setRoles((data ?? []).map((r: any) => r.role as AppRole));
        setLoading(false);
      }
    };
    if (!authLoading) load();
    return () => {
      active = false;
    };
  }, [user, authLoading]);

  const isAdmin = roles.includes("admin");
  const isStaff = roles.includes("staff") || isAdmin;
  const isPendingStaff = roles.includes("pending_staff");
  const isBanned = roles.includes("banned");
  const isStudent = roles.includes("student") && !isStaff && !isAdmin;
  const primary: AppRole = isBanned
    ? "banned"
    : isAdmin
    ? "admin"
    : isStaff
    ? "staff"
    : isPendingStaff
    ? "pending_staff"
    : "student";

  return { roles, primary, isAdmin, isStaff, isPendingStaff, isStudent, isBanned, loading };
}
