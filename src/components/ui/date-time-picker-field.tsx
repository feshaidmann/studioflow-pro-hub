import * as React from "react";
import { format, parse, isValid, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface DateTimePickerFieldProps {
  /** ISO datetime string or "" */
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  disablePast?: boolean;
  placeholder?: string;
  className?: string;
  /** If true, only show the date (no time) */
  dateOnly?: boolean;
}

/** Converts "yyyy-MM-dd'T'HH:mm" or ISO to Date */
function toDate(val: string): Date | undefined {
  if (!val) return undefined;
  const d = new Date(val);
  return isValid(d) ? d : undefined;
}

/** Extracts "HH:mm" from a datetime string */
function toTimeStr(val: string): string {
  if (!val) return "";
  try {
    const d = new Date(val);
    if (!isValid(d)) return "";
    return format(d, "HH:mm");
  } catch {
    return "";
  }
}

/** Extracts "yyyy-MM-dd" from a datetime string */
function toDateStr(val: string): string {
  if (!val) return "";
  try {
    const d = new Date(val);
    if (!isValid(d)) return "";
    return format(d, "yyyy-MM-dd");
  } catch {
    return "";
  }
}

export function DateTimePickerField({
  value,
  onChange,
  disabled,
  disablePast = false,
  placeholder = "Selecionar data",
  className,
  dateOnly = false,
}: DateTimePickerFieldProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = React.useMemo(() => toDate(value), [value]);
  const timeStr = React.useMemo(() => toTimeStr(value), [value]);
  const today = startOfDay(new Date());

  const handleSelectDate = (date: Date | undefined) => {
    if (!date) {
      onChange("");
      setOpen(false);
      return;
    }
    const existingTime = timeStr || "00:00";
    const [h, m] = existingTime.split(":").map(Number);
    date.setHours(h ?? 0, m ?? 0, 0, 0);
    onChange(format(date, "yyyy-MM-dd'T'HH:mm"));
    if (dateOnly) setOpen(false);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value;
    if (!t) return;
    const dateBase = selectedDate ?? new Date();
    const [h, m] = t.split(":").map(Number);
    dateBase.setHours(h ?? 0, m ?? 0, 0, 0);
    onChange(format(dateBase, "yyyy-MM-dd'T'HH:mm"));
  };

  const displayLabel = selectedDate
    ? dateOnly
      ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
      : `${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}  ${timeStr || "00:00"}`
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
        >
          <span className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
            {displayLabel ?? placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelectDate}
          initialFocus
          locale={ptBR}
          disabled={disablePast ? (date) => date < today : undefined}
          className="p-3 pointer-events-auto"
        />
        {!dateOnly && (
          <div className="border-t border-border px-3 pb-3 pt-2">
            <label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <Clock className="h-3 w-3" /> Horário
            </label>
            <Input
              type="time"
              value={timeStr || "00:00"}
              onChange={handleTimeChange}
              className="h-8 text-sm font-mono-nums w-28"
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
