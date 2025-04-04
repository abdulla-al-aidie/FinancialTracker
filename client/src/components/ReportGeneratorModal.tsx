import { useState, useRef } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format, subMonths } from "date-fns";
import { CalendarIcon, FileText, Download } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { ExpenseCategory } from "@/types/finance";
import jsPDF from "jspdf";
import 'jspdf-autotable';
// Import Chart.js with proper typings
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { createCanvas } from 'canvas';

// Add compatible canvas/context types for Chart.js
declare module 'chart.js' {
  interface ChartTypeRegistry {
    // Ensure bar/pie types are properly defined
    bar: {
      chartOptions: any;
      datasetOptions: any;
      defaultDataPoint: number;
      scales: any;
    };
    pie: {
      chartOptions: any;
      datasetOptions: any;
      defaultDataPoint: number;
      scales: any;
    };
  }
}

const reportFormSchema = z.object({
  month: z.date(),
  reportType: z.string(),
  includeIncome: z.boolean().default(true),
  includeExpenses: z.boolean().default(true),
  includeBudgets: z.boolean().default(true),
  includeGoals: z.boolean().default(true),
  includeRecommendations: z.boolean().default(true)
});

type ReportFormValues = z.infer<typeof reportFormSchema>;

interface ReportGeneratorModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ReportGeneratorModal({ open, onClose }: ReportGeneratorModalProps) {
  const { 
    totalIncome, 
    totalExpenses, 
    netCashflow, 
    savingsRate,
    expenses,
    incomes,
    budgets,
    goals,
    recommendations,
    activeMonth,
    months
  } = useFinance();
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      month: new Date(),
      reportType: "analysis",
      includeIncome: true,
      includeExpenses: true,
      includeBudgets: true,
      includeGoals: true,
      includeRecommendations: true
    }
  });
  
  async function onSubmit(values: ReportFormValues) {
    setIsGenerating(true);
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsGenerating(false);
    setReportGenerated(true);
  }
  
  // Create pie chart for PDF
  function createExpensePieChart(): string {
    // Create canvas element
    const canvas = createCanvas(400, 300);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Could not get canvas context');
      return '';
    }
    
    // Prepare data for the chart
    const expensesByCategory = Object.values(ExpenseCategory).map(category => {
      const totalForCategory = expenses
        .filter(expense => expense.category === category)
        .reduce((total, expense) => total + expense.amount, 0);
      
      return {
        category,
        total: totalForCategory
      };
    }).filter(item => item.total > 0);
    
    // Colors for the chart
    const COLORS = [
      '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', 
      '#82CA9D', '#FFAF8A', '#D0ED57', '#FFC658', '#A28BFF'
    ];
    
    // Create the chart
    new Chart(canvas, {
      type: 'pie',
      data: {
        labels: expensesByCategory.map(item => item.category),
        datasets: [{
          data: expensesByCategory.map(item => item.total),
          backgroundColor: COLORS,
          borderWidth: 1
        }]
      },
      options: {
        responsive: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              font: {
                size: 10
              }
            }
          },
          title: {
            display: true,
            text: 'Expenses by Category',
            font: {
              size: 14
            }
          }
        }
      }
    });
    
    // Convert canvas to image data URL
    return canvas.toDataURL('image/png');
  }
  
  // Create budget bar chart for PDF
  function createBudgetComparisonChart(): string {
    // Create canvas element
    const canvas = createCanvas(400, 300);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Could not get canvas context');
      return '';
    }
    
    // Prepare data for the chart
    const budgetData = budgets.map(budget => ({
      category: budget.category,
      limit: budget.limit,
      spent: budget.spent,
      percentage: budget.limit > 0 ? Math.min(100, (budget.spent / budget.limit) * 100) : 0
    })).sort((a, b) => b.percentage - a.percentage).slice(0, 6); // Top 6 budgets
    
    // Create the chart
    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: budgetData.map(item => item.category),
        datasets: [
          {
            label: 'Budget Limit',
            data: budgetData.map(item => item.limit),
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: 'Actual Spent',
            data: budgetData.map(item => item.spent),
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Amount ($)'
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Budget vs. Actual Spending',
            font: {
              size: 14
            }
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    });
    
    // Convert canvas to image data URL
    return canvas.toDataURL('image/png');
  }
  
  // Create goal progress chart for PDF
  function createGoalProgressChart(): string {
    // Create canvas element
    const canvas = createCanvas(400, 300);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Could not get canvas context');
      return '';
    }
    
    // Prepare data - get top 5 goals
    const goalData = goals
      .filter(goal => goal.targetAmount > 0)
      .map(goal => ({
        name: goal.description,
        current: goal.currentAmount,
        target: goal.targetAmount,
        percentage: Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
    
    // Create the chart
    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: goalData.map(item => item.name),
        datasets: [{
          label: 'Progress (%)',
          data: goalData.map(item => item.percentage),
          backgroundColor: goalData.map(item => 
            item.percentage < 25 ? 'rgba(255, 99, 132, 0.7)' : 
            item.percentage < 75 ? 'rgba(255, 206, 86, 0.7)' : 
            'rgba(75, 192, 192, 0.7)'
          ),
          borderColor: goalData.map(item => 
            item.percentage < 25 ? 'rgba(255, 99, 132, 1)' : 
            item.percentage < 75 ? 'rgba(255, 206, 86, 1)' : 
            'rgba(75, 192, 192, 1)'
          ),
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: false,
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Progress (%)'
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Goal Progress',
            font: {
              size: 14
            }
          }
        }
      }
    });
    
    // Convert canvas to image data URL
    return canvas.toDataURL('image/png');
  }
  
  function handleDownload() {
    // Generate PDF report using jsPDF
    const doc = new jsPDF();
    const reportMonth = format(form.getValues("month"), "MMMM yyyy");
    const reportType = form.getValues("reportType");
    const fileName = `financial-analysis-${format(new Date(), 'MMM-yyyy')}.pdf`;
    
    // Add title
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 128);
    doc.text("Financial Analysis Report", 105, 20, { align: "center" });
    
    // Add period
    doc.setFontSize(14);
    doc.setTextColor(70, 70, 70);
    doc.text(`Report Period: ${reportMonth}`, 105, 30, { align: "center" });
    doc.text("Includes AI-powered financial insights", 105, 38, { align: "center" });
    
    // Add date generated
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated: ${format(new Date(), "MMMM dd, yyyy")}`, 105, 45, { align: "center" });
    
    // Add horizontal line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 50, 190, 50);
    
    // Summary section
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("Financial Summary", 20, 60);
    
    // Summary data in table format
    doc.setFontSize(12);
    doc.text("Total Income:", 30, 70);
    doc.text(`$${totalIncome.toFixed(2)}`, 120, 70);
    
    doc.text("Total Expenses:", 30, 78);
    doc.text(`$${totalExpenses.toFixed(2)}`, 120, 78);
    
    doc.text("Net Cashflow:", 30, 86);
    if (netCashflow >= 0) {
      doc.setTextColor(0, 128, 0);
    } else {
      doc.setTextColor(255, 0, 0);
    }
    doc.text(`$${netCashflow.toFixed(2)}`, 120, 86);
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    doc.text("Savings Rate:", 30, 94);
    doc.text(`${savingsRate.toFixed(1)}%`, 120, 94);
    
    // Add horizontal line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 100, 190, 100);
    
    let yPosition = 110;
    
    // Include Expense Breakdown if selected
    if (form.getValues("includeExpenses")) {
      // Add expense breakdown section
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("Expense Breakdown", 20, yPosition);
      yPosition += 10;
      
      // Add expense pie chart
      if (expenses.length > 0) {
        const expenseChartData = createExpensePieChart();
        doc.addImage(expenseChartData, 'PNG', 30, yPosition, 150, 110);
        yPosition += 120;
        
        // Add expense table
        doc.setFontSize(14);
        doc.text("Expense Details", 20, yPosition);
        yPosition += 10;
        
        const expensesByCategory = Object.values(ExpenseCategory)
          .map(category => {
            const expensesInCategory = expenses.filter(e => e.category === category);
            const total = expensesInCategory.reduce((sum, e) => sum + e.amount, 0);
            return { category, total, count: expensesInCategory.length };
          })
          .filter(item => item.total > 0)
          .sort((a, b) => b.total - a.total);
        
        // Create expense table data
        const expenseTableData = expensesByCategory.map(item => [
          item.category,
          `$${item.total.toFixed(2)}`,
          item.count.toString(),
          `${((item.total / totalExpenses) * 100).toFixed(1)}%`
        ]);
        
        // Add expense table to PDF
        (doc as any).autoTable({
          head: [['Category', 'Amount', 'Count', '% of Total']],
          body: expenseTableData,
          startY: yPosition,
          theme: 'grid',
          headStyles: { fillColor: [0, 102, 204], textColor: 255 },
          alternateRowStyles: { fillColor: [240, 240, 240] },
          margin: { top: 10 }
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 15;
      } else {
        doc.setFontSize(12);
        doc.text("No expense data available for the selected period.", 30, yPosition);
        yPosition += 20;
      }
      
      // Check if we need to add a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
    }
    
    // Add Budget section if selected
    if (form.getValues("includeBudgets")) {
      doc.setFontSize(16);
      doc.text("Budget Analysis", 20, yPosition);
      yPosition += 10;
      
      if (budgets.length > 0) {
        // Add budget comparison chart
        const budgetChartData = createBudgetComparisonChart();
        doc.addImage(budgetChartData, 'PNG', 30, yPosition, 150, 110);
        yPosition += 120;
        
        // Add budget table
        doc.setFontSize(14);
        doc.text("Budget Details", 20, yPosition);
        yPosition += 10;
        
        // Create budget table data
        const budgetTableData = budgets
          .sort((a, b) => (b.spent / b.limit) - (a.spent / a.limit))
          .map(budget => [
            budget.category,
            `$${budget.limit.toFixed(2)}`,
            `$${budget.spent.toFixed(2)}`,
            `${budget.limit > 0 ? Math.min(100, (budget.spent / budget.limit) * 100).toFixed(1) : 0}%`,
            budget.limit > 0 && budget.spent > budget.limit ? 'Over Budget' : 'Within Budget'
          ]);
        
        // Add budget table to PDF
        (doc as any).autoTable({
          head: [['Category', 'Budget Limit', 'Spent', '% Used', 'Status']],
          body: budgetTableData,
          startY: yPosition,
          theme: 'grid',
          headStyles: { fillColor: [0, 102, 204], textColor: 255 },
          alternateRowStyles: { fillColor: [240, 240, 240] },
          margin: { top: 10 }
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 15;
      } else {
        doc.setFontSize(12);
        doc.text("No budget data available for the selected period.", 30, yPosition);
        yPosition += 20;
      }
      
      // Check if we need to add a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
    }
    
    // Add Goals section if selected
    if (form.getValues("includeGoals")) {
      doc.setFontSize(16);
      doc.text("Goal Progress", 20, yPosition);
      yPosition += 10;
      
      if (goals.length > 0) {
        // Add goal progress chart
        const goalChartData = createGoalProgressChart();
        doc.addImage(goalChartData, 'PNG', 30, yPosition, 150, 110);
        yPosition += 120;
        
        // Add goal table
        doc.setFontSize(14);
        doc.text("Goal Details", 20, yPosition);
        yPosition += 10;
        
        // Create goal table data
        const goalTableData = goals.map(goal => [
          goal.description,
          `$${goal.targetAmount.toFixed(2)}`,
          `$${goal.currentAmount.toFixed(2)}`,
          `${((goal.currentAmount / goal.targetAmount) * 100).toFixed(1)}%`,
          format(new Date(goal.targetDate), 'MMM dd, yyyy')
        ]);
        
        // Add goal table to PDF
        (doc as any).autoTable({
          head: [['Goal', 'Target Amount', 'Current Amount', 'Progress', 'Target Date']],
          body: goalTableData,
          startY: yPosition,
          theme: 'grid',
          headStyles: { fillColor: [0, 102, 204], textColor: 255 },
          alternateRowStyles: { fillColor: [240, 240, 240] },
          margin: { top: 10 }
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 15;
      } else {
        doc.setFontSize(12);
        doc.text("No goal data available.", 30, yPosition);
        yPosition += 20;
      }
      
      // Check if we need to add a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
    }
    
    // Add Recommendations section if selected
    if (form.getValues("includeRecommendations")) {
      // Add page for recommendations if needed
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("Financial Insights & Recommendations", 20, yPosition);
      yPosition += 15;
      
      // Add some insights based on the data
      doc.setFontSize(12);
      
      if (netCashflow >= 0) {
        doc.text("• Your income is greater than your expenses, which is a positive sign.", 30, yPosition);
        yPosition += 8;
        doc.text(`• With a savings rate of ${savingsRate.toFixed(1)}%, you're building financial security.`, 30, yPosition);
        yPosition += 8;
      } else {
        doc.text("• Your expenses are exceeding your income, which may lead to financial strain.", 30, yPosition);
        yPosition += 8;
        doc.text("• Consider reviewing your budget to find areas where you can reduce spending.", 30, yPosition);
        yPosition += 8;
      }
      
      // Add recommendations from AI if available
      if (recommendations.length > 0) {
        yPosition += 10;
        doc.setFontSize(14);
        doc.text("AI-Generated Recommendations", 20, yPosition);
        yPosition += 10;
        
        recommendations.slice(0, 3).forEach(rec => {
          doc.setFontSize(12);
          doc.text(`• ${rec.description}`, 30, yPosition);
          yPosition += 8;
        });
      } else {
        // Add generic recommendations
        yPosition += 10;
        if (savingsRate < 20) {
          doc.text("• Try to increase your savings rate to at least 20% for long-term financial health.", 30, yPosition);
          yPosition += 8;
        }
        
        if (totalIncome > 0) {
          doc.text("• Consider setting up an emergency fund with 3-6 months of expenses.", 30, yPosition);
          yPosition += 8;
        }
        
        doc.text("• Review your spending patterns to identify opportunities for saving.", 30, yPosition);
        yPosition += 8;
      }
    }
    
    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: "center" });
      doc.text("Finance Tracker App - Confidential Financial Report", 105, 280, { align: "center" });
    }
    
    // Save the PDF
    doc.save(fileName);
    
    onClose();
  }
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate Financial Analysis Report</DialogTitle>
          <DialogDescription>
            Create a detailed analysis report with personalized insights
          </DialogDescription>
        </DialogHeader>
        
        {!reportGenerated ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Report Month</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "MMMM yyyy")
                            ) : (
                              <span>Select month</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Report type is fixed to "analysis" */}
              <input type="hidden" name="reportType" value="analysis" />
              
              <div className="space-y-2">
                <FormLabel>Include Sections</FormLabel>
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="includeIncome"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Income</FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="includeExpenses"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Expenses</FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="includeBudgets"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Budgets</FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="includeGoals"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Goals</FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="includeRecommendations"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Recommendations</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={isGenerating}>
                  {isGenerating ? "Analyzing..." : "Generate Analysis Report"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center py-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Analysis Ready</h3>
              <p className="text-sm text-gray-500 text-center mt-1">
                Your financial analysis report has been generated successfully
              </p>
            </div>
            
            <div className="border rounded-md p-4 bg-gray-50">
              <h4 className="font-medium text-sm mb-2">Analysis Summary</h4>
              <ul className="space-y-1 text-sm">
                <li className="flex justify-between">
                  <span className="text-gray-600">Period:</span>
                  <span className="font-medium">{format(form.getValues("month"), "MMMM yyyy")}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-600">Total Income:</span>
                  <span className="font-medium">${totalIncome.toFixed(2)}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-600">Total Expenses:</span>
                  <span className="font-medium">${totalExpenses.toFixed(2)}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-600">Net Cashflow:</span>
                  <span className={`font-medium ${netCashflow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    ${netCashflow.toFixed(2)}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-600">Savings Rate:</span>
                  <span className="font-medium">{savingsRate.toFixed(1)}%</span>
                </li>
              </ul>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Close</Button>
              <Button 
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download Analysis
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}