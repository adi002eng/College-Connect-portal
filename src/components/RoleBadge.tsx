import { Badge } from "@/components/ui/badge";
import { ShieldCheck, GraduationCap, Hourglass, Ban, Crown } from "lucide-react";
import type { AppRole } from "@/hooks/useRole";

export default function RoleBadge({ role }: { role: AppRole }) {
  switch (role) {
    case "admin":
      return (
        <Badge className="gradient-warm text-white border-0 gap-1">
          <Crown className="h-3 w-3" /> Admin
        </Badge>
      );
    case "staff":
      return (
        <Badge className="bg-success text-success-foreground border-0 gap-1">
          <ShieldCheck className="h-3 w-3" /> Staff
        </Badge>
      );
    case "pending_staff":
      return (
        <Badge variant="secondary" className="gap-1">
          <Hourglass className="h-3 w-3" /> Pending
        </Badge>
      );
    case "banned":
      return (
        <Badge variant="destructive" className="gap-1">
          <Ban className="h-3 w-3" /> Banned
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <GraduationCap className="h-3 w-3" /> Student
        </Badge>
      );
  }
}
