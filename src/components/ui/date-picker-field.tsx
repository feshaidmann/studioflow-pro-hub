import * as React from "react";
import { format, parse, isValid, startOfDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerFieldProps {
  value: string; // "dd/MM/yyyy" or ""
  onChange: (val: string) => void;
  disabled?: boolean;
  disablePast?: boolean;
  placeholder?: string;
  className?: string;
}

export function DatePickerField({
  value,
  onChange,
  disabled,
  disablePast = false,
  placeholder = "Selecionar data",
  className,
}: DatePickerFieldProps) {
  const [open, setOpen] = React.useState(false);

  const parsed = React.useMemo(() => {
    if (!value) return undefined;
    const d = parse(value, "dd/MM/yyyy", new Date());
    return isValid(d) ? d : undefined;
  }, [value]);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, "dd/MM/yyyy"));
    } else {
      onChange("");
    }
    setOpen(false);
  };

  const today = startOfDay(new Date());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !parsed && "text-muted-foreground",
            className
          )}
        >
          {parsed ? format(parsed, "dd/MM/yyyy") : placeholder}
          <CalendarIcon className="h-4 w-4 text-primary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={parsed}
          onSelect={handleSelect}
          initialFocus
          disabled={disablePast ? (date) => date < today : undefined}
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
