import { useState } from "react";
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
import { format } from "date-fns";
import { CalendarIcon, FileText, Download } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import jsPDF from "jspdf";

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
  const { totalIncome, totalExpenses, netCashflow, savingsRate } = useFinance();
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      month: new Date(),
      reportType: "detailed",
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
  
  function handleDownload() {
    // Generate PDF report using jsPDF
    const doc = new jsPDF();
    const reportMonth = format(form.getValues("month"), "MMMM yyyy");
    const reportType = form.getValues("reportType");
    const fileName = `finance-report-${format(new Date(), 'MMM-yyyy')}.pdf`;
    
    // Add title
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 128);
    doc.text("Monthly Financial Report", 105, 20, { align: "center" });
    
    // Add period
    doc.setFontSize(14);
    doc.setTextColor(70, 70, 70);
    doc.text(`Report Period: ${reportMonth}`, 105, 30, { align: "center" });
    doc.text(`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, 105, 38, { align: "center" });
    
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
    
    // Insights & Recommendations section
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("Financial Insights", 20, 110);
    
    // Add some insights based on the data
    doc.setFontSize(12);
    let y = 120;
    
    if (netCashflow >= 0) {
      doc.text("• Your income is greater than your expenses, which is a positive sign.", 30, y);
      y += 8;
      doc.text(`• With a savings rate of ${savingsRate.toFixed(1)}%, you're building financial security.`, 30, y);
    } else {
      doc.text("• Your expenses are exceeding your income, which may lead to financial strain.", 30, y);
      y += 8;
      doc.text("• Consider reviewing your budget to find areas where you can reduce spending.", 30, y);
    }
    
    y += 16;
    doc.setFontSize(16);
    doc.text("Recommendations", 20, y);
    
    y += 10;
    doc.setFontSize(12);
    if (savingsRate < 20) {
      doc.text("• Try to increase your savings rate to at least 20% for long-term financial health.", 30, y);
      y += 8;
    }
    
    if (totalIncome > 0) {
      doc.text("• Consider setting up an emergency fund with 3-6 months of expenses.", 30, y);
      y += 8;
    }
    
    doc.text("• Review your spending patterns to identify opportunities for saving.", 30, y);
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Finance Tracker App - Confidential Financial Report", 105, 280, { align: "center" });
    
    // Save the PDF
    doc.save(fileName);
    
    onClose();
  }
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate Monthly Finance Report</DialogTitle>
          <DialogDescription>
            Create a comprehensive report of your financial activity
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
              
              <FormField
                control={form.control}
                name="reportType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select report type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="summary">Summary Report</SelectItem>
                        <SelectItem value="detailed">Detailed Report</SelectItem>
                        <SelectItem value="analysis">Analysis Report with Insights</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
                  {isGenerating ? "Generating..." : "Generate Report"}
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
              <h3 className="text-lg font-semibold">Report Ready</h3>
              <p className="text-sm text-gray-500 text-center mt-1">
                Your monthly finance report has been generated successfully
              </p>
            </div>
            
            <div className="border rounded-md p-4 bg-gray-50">
              <h4 className="font-medium text-sm mb-2">Report Summary</h4>
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
                Download Report
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}