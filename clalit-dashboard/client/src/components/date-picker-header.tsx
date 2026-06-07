import { format } from "date-fns";
import { he } from "date-fns/locale/he";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDateContext } from "@/lib/useDateContext";
import { queryClient } from "@/lib/queryClient";

export function DatePickerHeader() {
  const { asOfDate, setAsOfDate, isHistorical } = useDateContext();

  // Max = today, min = 7 days ago
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const selectedDate = asOfDate ? new Date(`${asOfDate}T12:00:00`) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const iso = format(date, "yyyy-MM-dd");
      setAsOfDate(iso);
      queryClient.invalidateQueries();
    }
  };

  const clearHistorical = () => {
    setAsOfDate(null);
    queryClient.invalidateQueries();
  };

  const label = selectedDate
    ? format(selectedDate, "d בMMMM yyyy", { locale: he })
    : "היום";

  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={isHistorical ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 gap-1.5"
            data-testid="date-picker-trigger"
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            <span className="text-xs">{label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={(date) => date > today || date < sevenDaysAgo}
            locale={he}
            dir="rtl"
            initialFocus
          />
          <div className="p-3 border-t text-xs text-muted-foreground text-center">
            זמינים 7 ימים אחרונים
          </div>
        </PopoverContent>
      </Popover>
      {isHistorical && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={clearHistorical}
          title="חזרה לזמן אמת"
          data-testid="date-picker-clear"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
