import { ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
  type ApplicationStatus,
} from "@/hooks/useEditalApplications";

const ORDER: ApplicationStatus[] = ["interesse", "preparando", "inscrito", "resultado"];

interface Props {
  status: ApplicationStatus;
  onChange: (next: ApplicationStatus) => void;
  disabled?: boolean;
}

export default function ApplicationStatusMenu({ status, onChange, disabled }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled} onClick={(e) => e.stopPropagation()}>
        <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] gap-1">
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border-0", APPLICATION_STATUS_COLORS[status])}>
            {APPLICATION_STATUS_LABELS[status]}
          </Badge>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel className="text-[11px]">Atualizar status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ORDER.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => onChange(s)}
            className="text-xs gap-2"
          >
            {s === status ? <Check className="h-3 w-3 text-primary" /> : <span className="w-3" />}
            {APPLICATION_STATUS_LABELS[s]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
