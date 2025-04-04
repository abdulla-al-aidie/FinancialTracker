import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function MonthSelector() {
  const [calendarDate, setCalendarDate] = useState<Date | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  const { 
    months, 
    activeMonth, 
    setActiveMonth, 
    addMonth,
    compareWithPreviousMonth
  } = useFinance();
  
  // Generate a list of available months (past 12 months to future 12 months)
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    
    // Add past 12 months
    for (let i = 12; i >= 1; i--) {
      const pastDate = subMonths(now, i);
      const monthId = format(pastDate, "yyyy-MM");
      options.push({
        id: monthId,
        name: format(pastDate, "MMMM yyyy"),
        date: pastDate
      });
    }
    
    // Add current month
    options.push({
      id: format(now, "yyyy-MM"),
      name: format(now, "MMMM yyyy"),
      date: now
    });
    
    // Add future 12 months
    for (let i = 1; i <= 12; i++) {
      const futureDate = addMonths(now, i);
      const monthId = format(futureDate, "yyyy-MM");
      options.push({
        id: monthId,
        name: format(futureDate, "MMMM yyyy"),
        date: futureDate
      });
    }
    
    return options;
  };
  
  const monthOptions = generateMonthOptions();
  
  // Handle month selection
  const handleMonthSelect = (monthId: string) => {
    // Check if the month exists in our data
    const exists = months.some(m => m.id === monthId);
    
    if (!exists) {
      // Month doesn't exist, so add it first
      const option = monthOptions.find(opt => opt.id === monthId);
      if (option) {
        addMonth(option.date.toISOString());
      }
    }
    
    // Set the active month
    setActiveMonth(monthId);
  };
  
  // Handle custom month selection via calendar
  const handleAddCustomMonth = () => {
    if (calendarDate) {
      addMonth(calendarDate.toISOString());
      setCalendarDate(undefined);
      setCalendarOpen(false);
    }
  };
  
  // Get comparison with previous month
  const comparison = compareWithPreviousMonth();
  
  return (
    <div className="flex flex-col space-y-4 bg-card p-4 rounded-lg shadow-sm w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Month Selection</h2>
        
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Custom Month
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={calendarDate}
              onSelect={setCalendarDate}
              initialFocus
            />
            <div className="p-3 border-t border-border flex justify-end">
              <Button 
                onClick={handleAddCustomMonth} 
                disabled={!calendarDate}
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
              {/* First show existing months */}
              {months.length > 0 && (
                <>
                  <div className="font-medium text-xs text-muted-foreground px-2 py-1">
                    Your Months
                  </div>
                  {months.map((month: MonthData) => (
                    <SelectItem key={month.id} value={month.id}>
                      {month.name}
                      {month.isActive && <span className="ml-2 text-muted-foreground">(Current)</span>}
                    </SelectItem>
                  ))}
                  <div className="h-px bg-muted my-1" />
                </>
              )}
              
              {/* Then show all available months */}
              <div className="font-medium text-xs text-muted-foreground px-2 py-1">
                All Months
              </div>
              {monthOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
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