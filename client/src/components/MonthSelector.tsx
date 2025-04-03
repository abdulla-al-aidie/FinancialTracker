import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { MonthData } from "@/types/finance";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useFinance } from "@/contexts/FinanceContext";
import { Badge } from "./ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MonthSelector() {
  const [date, setDate] = useState<Date | undefined>();
  const [open, setOpen] = useState(false);
  
  const { 
    months, 
    activeMonth, 
    setActiveMonth, 
    addMonth,
    compareWithPreviousMonth
  } = useFinance();
  
  // Handle month selection
  const handleMonthSelect = (monthId: string) => {
    setActiveMonth(monthId);
  };
  
  // Handle adding a new month
  const handleAddMonth = () => {
    if (date) {
      addMonth(date.toISOString());
      setDate(undefined);
      setOpen(false);
    }
  };
  
  // Get comparison with previous month
  const comparison = compareWithPreviousMonth();
  
  return (
    <div className="flex flex-col space-y-4 bg-card p-4 rounded-lg shadow-sm w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Month Selection</h2>
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Add Month
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
            />
            <div className="p-3 border-t border-border flex justify-end">
              <Button 
                onClick={handleAddMonth} 
                disabled={!date}
                size="sm"
              >
                Add Month
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="w-full sm:w-64">
          <Select value={activeMonth} onValueChange={handleMonthSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month: MonthData) => (
                <SelectItem key={month.id} value={month.id}>
                  {month.name}
                  {month.isActive && <span className="ml-2 text-muted-foreground">(Current)</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {months.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <Badge variant={comparison.incomeChange >= 0 ? "default" : "destructive"}>
              Income: {comparison.incomeChange >= 0 ? "+" : ""}{comparison.incomeChange.toFixed(2)}
            </Badge>
            <Badge variant={comparison.expenseChange <= 0 ? "default" : "destructive"}>
              Expenses: {comparison.expenseChange >= 0 ? "+" : ""}{comparison.expenseChange.toFixed(2)}
            </Badge>
            <Badge variant={comparison.savingsChange >= 0 ? "default" : "destructive"}>
              Savings: {comparison.savingsChange >= 0 ? "+" : ""}{comparison.savingsChange.toFixed(2)}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}