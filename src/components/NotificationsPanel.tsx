import { useState } from "react";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const typeColors: Record<string, string> = {
  income: "bg-green-500/20 text-green-400",
  deadline: "bg-amber-500/20 text-amber-400",
  stage: "bg-primary/20 text-primary",
  payment: "bg-amber-500/20 text-amber-400",
  general: "bg-secondary text-muted-foreground",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

interface NotificationsBellProps {
  compact?: boolean;
  showLabel?: boolean;
  className?: string;
  align?: "start" | "center" | "end";
}

export default function NotificationsBell({
  compact = false,
  showLabel = false,
  className,
  align = "end",
}: NotificationsBellProps) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleClick = (n: typeof notifications[0]) => {
    markRead(n.id);
    if (n.link) {
      navigate(n.link);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className={cn(
            "relative",
            compact
              ? "h-8 w-8"
              : "w-full justify-start gap-3 text-muted-foreground hover:text-foreground",
            className
          )}
        >
          <Bell className="h-5 w-5 shrink-0" />
          {showLabel && <span className="truncate">Notificações</span>}
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        sideOffset={8}
        className="w-80 p-0 rounded-xl border-border bg-card shadow-2xl shadow-black/40 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Notificações</span>
            {unreadCount > 0 && (
              <Badge className="h-5 px-1.5 text-[10px] bg-primary text-primary-foreground">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={markAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5" /> Marcar todas
            </Button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[360px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center px-4">
              <Bell className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Sem notificações ainda.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-secondary/40 border-b border-border/40 last:border-0",
                  !n.read && "bg-primary/5"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 h-2 w-2 rounded-full shrink-0",
                    !n.read ? "bg-primary" : "bg-transparent"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm font-medium leading-tight",
                        !n.read ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {n.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  {n.link && (
                    <span className="text-[10px] text-primary flex items-center gap-0.5 mt-1">
                      <ExternalLink className="h-3 w-3" /> Ver detalhes
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
