import { useState, useEffect, useMemo } from "react";
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
  
  // Get the current active month/year
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const [year] = activeMonth.split('-');
    return year;
  });
  
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const [, month] = activeMonth.split('-');
    return month;
  });
  
  // Generate years (past 5 years to future 5 years)
  const years = useMemo(() => {
    const yearsList = [];
    const currentYear = new Date().getFullYear();
    
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      yearsList.push(i.toString());
    }
    
    return yearsList;
  }, []);
  
  // Generate months (1-12)
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  // Handle year selection
  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    const newMonthId = `${year}-${selectedMonth}`;
    updateSelectedMonth(newMonthId);
  };
  
  // Handle month selection
  const handleMonthChange = (monthIndex: string) => {
    setSelectedMonth(monthIndex);
    const newMonthId = `${selectedYear}-${monthIndex}`;
    updateSelectedMonth(newMonthId);
  };
  
  // Update the selected month
  const updateSelectedMonth = (monthId: string) => {
    // Check if month already exists in our data
    const exists = months.some(m => m.id === monthId);
    
    if (!exists) {
      // Month doesn't exist, so add it first
      const date = new Date(`${monthId}-01`);
      addMonth(date.toISOString());
    }
    
    // Set the active month
    setActiveMonth(monthId);
  };
  
  // Handle custom month selection via calendar
  const handleAddCustomMonth = () => {
    if (calendarDate) {
      addMonth(calendarDate.toISOString());
      
      // Update the selected year and month
      const year = format(calendarDate, "yyyy");
      const month = format(calendarDate, "MM");
      setSelectedYear(year);
      setSelectedMonth(month);
      
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
              Calendar View
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
                Select Month
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex gap-2 w-full sm:w-auto">
          {/* Month Dropdown */}
          <div className="w-full sm:w-32">
            <Select value={selectedMonth} onValueChange={handleMonthChange}>
              <SelectTrigger>
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {monthNames.map((name, index) => (
                  <SelectItem 
                    key={index}
                    value={String(index + 1).padStart(2, '0')}
                  >
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Year Dropdown */}
          <div className="w-full sm:w-28">
            <Select value={selectedYear} onValueChange={handleYearChange}>
              <SelectTrigger>
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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