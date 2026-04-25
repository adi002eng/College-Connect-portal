import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DeleteButtonProps {
  table: "notes" | "events" | "team_posts" | "anon_questions" | "anon_answers";
  id: string;
  label?: string;
  itemLabel?: string;
  onDeleted?: () => void;
  variant?: "ghost" | "outline" | "destructive";
  size?: "sm" | "icon" | "default";
  className?: string;
}

export function DeleteButton({
  table,
  id,
  label,
  itemLabel = "item",
  onDeleted,
  variant = "ghost",
  size = "sm",
  className,
}: DeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    const { error } = await supabase.from(table).delete().eq("id", id);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1)} deleted`);
    setOpen(false);
    onDeleted?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`text-destructive hover:text-destructive hover:bg-destructive/10 ${className ?? ""}`}
        >
          <Trash2 className="h-4 w-4" />
          {label && <span className="ml-1.5">{label}</span>}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this {itemLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The {itemLabel} will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
