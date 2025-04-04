import { useState, useMemo } from "react";
import { format } from "date-fns";
import { MonthData } from "@/types/finance";

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
      // This will initialize the month with carried-over data from the previous month
      const date = new Date(`${monthId}-01`);
      addMonth(date.toISOString());
    }
    
    // Set the active month (this will cause all data to be month-specific)
    setActiveMonth(monthId);
  };
  
  // Get comparison with previous month
  const comparison = compareWithPreviousMonth();
  
  return (
    <div className="flex flex-col space-y-4 bg-card p-4 rounded-lg shadow-sm w-full">
      <div className="flex items-center">
        <h2 className="text-xl font-bold">Month Selection</h2>
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
            {/* Income badge - only turns green when income is added (positive change) */}
            {comparison.incomeChange > 0 ? (
              <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">
                Income: +{comparison.incomeChange.toFixed(2)}
              </Badge>
            ) : (
              <Badge variant={comparison.incomeChange < 0 ? "destructive" : "default"}>
                Income: {comparison.incomeChange >= 0 ? "+" : ""}{comparison.incomeChange.toFixed(2)}
              </Badge>
            )}
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