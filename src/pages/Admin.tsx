import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Check, X, Ban, Trash2, Shield, FileText, Search, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import RoleBadge, {} from "@/components/RoleBadge";
import type { AppRole } from "@/hooks/useRole";

interface UserRow {
  id: string;
  full_name: string | null;
  college: string | null;
  role: string | null;
  skills: string | null;
  is_banned: boolean;
  created_at: string;
  primary_role: AppRole;
  roles: AppRole[];
}

interface VerificationRow {
  id: string;
  user_id: string;
  proof_url: string;
  note: string | null;
  status: string;
  created_at: string;
  profile?: { full_name: string | null; college: string | null } | null;
}

export default function Admin() {
  const { isAdmin, loading: roleLoading } = useRole();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [verifications, setVerifications] = useState<VerificationRow[]>([]);
  const [stats, setStats] = useState({ users: 0, staff: 0, pending: 0, events: 0, notes: 0, teams: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const computePrimary = (roles: AppRole[]): AppRole => {
    if (roles.includes("banned")) return "banned";
    if (roles.includes("admin")) return "admin";
    if (roles.includes("staff")) return "staff";
    if (roles.includes("pending_staff")) return "pending_staff";
    return "student";
  };

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: ver }, { count: eventsCount }, { count: notesCount }, { count: teamsCount }] =
      await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("staff_verifications").select("*").order("created_at", { ascending: false }),
        supabase.from("events").select("*", { count: "exact", head: true }),
        supabase.from("notes").select("*", { count: "exact", head: true }),
        supabase.from("team_posts").select("*", { count: "exact", head: true }),
      ]);

    const rolesByUser: Record<string, AppRole[]> = {};
    (roles ?? []).forEach((r: any) => {
      rolesByUser[r.user_id] = [...(rolesByUser[r.user_id] ?? []), r.role as AppRole];
    });

    const rows: UserRow[] = (profiles ?? []).map((p: any) => {
      const userRoles = rolesByUser[p.id] ?? ["student"];
      return {
        id: p.id,
        full_name: p.full_name,
        college: p.college,
        role: p.role,
        skills: p.skills,
        is_banned: p.is_banned,
        created_at: p.created_at,
        roles: userRoles,
        primary_role: computePrimary(userRoles),
      };
    });

    setUsers(rows);
    setStats({
      users: rows.length,
      staff: rows.filter((r) => r.primary_role === "staff" || r.primary_role === "admin").length,
      pending: rows.filter((r) => r.primary_role === "pending_staff").length,
      events: eventsCount ?? 0,
      notes: notesCount ?? 0,
      teams: teamsCount ?? 0,
    });

    // attach profile to verification
    const verRows: VerificationRow[] = (ver ?? []).map((v: any) => ({
      ...v,
      profile: profiles?.find((p: any) => p.id === v.user_id) ?? null,
    }));

    // Surface pending_staff users that don't yet have a staff_verifications row
    // (e.g. signed up but proof upload was blocked by email confirmation).
    const verUserIds = new Set(verRows.map((v) => v.user_id));
    const pendingWithoutProof: VerificationRow[] = rows
      .filter((u) => u.primary_role === "pending_staff" && !verUserIds.has(u.id))
      .map((u) => ({
        id: `pending-${u.id}`,
        user_id: u.id,
        proof_url: "",
        note: u.skills,
        status: "pending",
        created_at: u.created_at,
        profile: { full_name: u.full_name, college: u.college },
      }));

    setVerifications([...pendingWithoutProof, ...verRows]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const getProofUrl = async (path: string) => {
    if (signedUrls[path]) return signedUrls[path];
    const { data } = await supabase.storage.from("staff-proofs").createSignedUrl(path, 600);
    if (data?.signedUrl) {
      setSignedUrls((prev) => ({ ...prev, [path]: data.signedUrl }));
      return data.signedUrl;
    }
    return null;
  };

  const approve = async (userId: string) => {
    const { error } = await supabase.rpc("approve_staff", { _user_id: userId });
    if (error) return toast.error(error.message);
    toast.success("Staff approved ✅");
    load();
  };
  const reject = async (userId: string) => {
    const { error } = await supabase.rpc("reject_staff", { _user_id: userId });
    if (error) return toast.error(error.message);
    toast.success("Rejected");
    load();
  };
  const ban = async (userId: string) => {
    if (!confirm("Ban this user?")) return;
    const { error } = await supabase.rpc("ban_user", { _user_id: userId });
    if (error) return toast.error(error.message);
    toast.success("User banned");
    load();
  };
  const unban = async (userId: string) => {
    const { error } = await supabase.rpc("unban_user", { _user_id: userId });
    if (error) return toast.error(error.message);
    toast.success("User unbanned");
    load();
  };
  const deleteUser = async (userId: string) => {
    if (!confirm("Delete this user's profile and roles? Auth account remains; you can disable it from backend.")) return;
    const { error } = await supabase.rpc("delete_user_profile", { _user_id: userId });
    if (error) return toast.error(error.message);
    toast.success("Profile deleted");
    load();
  };

  if (roleLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!isAdmin) return <Navigate to="/app" replace />;

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.college?.toLowerCase().includes(q) ||
      u.primary_role.includes(q)
    );
  });

  const pendingVer = verifications.filter((v) => v.status === "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-4xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" /> Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Manage users, verify staff, monitor activity</p>
        </div>
        <Button variant="outline" onClick={load}>
          <RotateCcw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Users", value: stats.users },
          { label: "Verified Staff", value: stats.staff },
          { label: "Pending", value: stats.pending },
          { label: "Events", value: stats.events },
          { label: "Notes", value: stats.notes },
          { label: "Teams", value: stats.teams },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border/50 rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-2xl font-display font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="verifications">
        <TabsList>
          <TabsTrigger value="verifications">
            Verification Requests {pendingVer.length > 0 && <Badge variant="destructive" className="ml-2">{pendingVer.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="users">All Users ({users.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="verifications" className="mt-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : verifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card border border-border/50 rounded-2xl">
              No verification requests yet
            </div>
          ) : (
            verifications.map((v) => (
              <VerificationCard
                key={v.id}
                v={v}
                onApprove={() => approve(v.user_id)}
                onReject={() => reject(v.user_id)}
                getProofUrl={getProofUrl}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-4 space-y-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, college, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>College</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
                ) : (
                  filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="font-medium">{u.full_name ?? "—"}</div>
                        {u.skills && <div className="text-xs text-muted-foreground line-clamp-1">{u.skills}</div>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.college ?? "—"}</TableCell>
                      <TableCell><RoleBadge role={u.primary_role} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {u.primary_role === "pending_staff" && (
                          <>
                            <Button size="sm" onClick={() => approve(u.id)} className="bg-success text-success-foreground hover:opacity-90">
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => reject(u.id)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {u.primary_role === "banned" ? (
                          <Button size="sm" variant="outline" onClick={() => unban(u.id)}>
                            <RotateCcw className="h-3 w-3 mr-1" /> Unban
                          </Button>
                        ) : (
                          u.primary_role !== "admin" && (
                            <Button size="sm" variant="outline" onClick={() => ban(u.id)}>
                              <Ban className="h-3 w-3" />
                            </Button>
                          )
                        )}
                        {u.primary_role !== "admin" && (
                          <Button size="sm" variant="ghost" onClick={() => deleteUser(u.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function VerificationCard({
  v,
  onApprove,
  onReject,
  getProofUrl,
}: {
  v: VerificationRow;
  onApprove: () => void;
  onReject: () => void;
  getProofUrl: (p: string) => Promise<string | null>;
}) {
  const [url, setUrl] = useState<string | null>(null);

  const view = async () => {
    const u = await getProofUrl(v.proof_url);
    if (u) {
      setUrl(u);
      window.open(u, "_blank");
    } else {
      toast.error("Could not load proof");
    }
  };

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{v.profile?.full_name ?? "Unknown"}</span>
            <Badge variant="secondary">{v.profile?.college ?? "—"}</Badge>
            <Badge
              variant={
                v.status === "approved" ? "default" : v.status === "rejected" ? "destructive" : "secondary"
              }
            >
              {v.status}
            </Badge>
          </div>
          {v.note && <p className="text-sm text-muted-foreground mt-2">{v.note}</p>}
          <div className="text-xs text-muted-foreground mt-2">
            Submitted {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={view}>
            <FileText className="h-4 w-4 mr-1" /> View proof
          </Button>
          {v.status === "pending" && (
            <>
              <Button size="sm" onClick={onApprove} className="bg-success text-success-foreground hover:opacity-90">
                <Check className="h-4 w-4 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={onReject}>
                <X className="h-4 w-4 mr-1" /> Reject
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
