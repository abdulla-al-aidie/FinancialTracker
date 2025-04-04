import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { Budget, ExpenseCategory } from "@/types/finance";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatCurrency } from "@/lib/calculations";

// Form schema for quick budget entry
const quickBudgetSchema = z.object({
  category: z.nativeEnum(ExpenseCategory, {
    required_error: "Please select a category",
  }),
  limit: z.coerce.number().min(1, "Budget limit must be at least 1"),
});

type QuickBudgetFormValues = z.infer<typeof quickBudgetSchema>;

export default function BudgetTemplate() {
  const { budgets, setBudget, expenses, totalIncome } = useFinance();
  const [isFormVisible, setIsFormVisible] = useState(false);
  
  // Default category for the pie chart (either "used" or "available")
  const [pieView, setPieView] = useState<"category" | "status">("category");
  
  // Initialize form
  const form = useForm<QuickBudgetFormValues>({
    resolver: zodResolver(quickBudgetSchema),
    defaultValues: {
      category: undefined,
      limit: undefined,
    },
  });
  
  // Calculate total budget limit and spending
  const totalBudgetLimit = budgets.reduce((sum, budget) => sum + budget.limit, 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
  const remainingBudget = totalBudgetLimit - totalSpent;
  const unbudgeted = Math.max(0, totalIncome - totalBudgetLimit);
  
  // Prepare data for the pie charts
  const budgetByCategory = budgets.map((budget) => ({
    name: budget.category,
    value: budget.limit,
    spent: budget.spent,
    color: getCategoryColor(budget.category),
  }));
  
  // Add unbudgeted income to the pie chart if there is any
  if (unbudgeted > 0) {
    budgetByCategory.push({
      name: "Unbudgeted" as any, // Type assertion to avoid type error
      value: unbudgeted,
      spent: 0,
      color: "#cbd5e1", // Light gray color
    });
  }
  
  // Data for budget status pie chart (used vs remaining)
  const budgetStatusData = [
    { name: "Spent", value: totalSpent, color: "#ef4444" }, // Red
    { name: "Remaining", value: remainingBudget, color: "#22c55e" }, // Green
  ];
  
  // Function to get different colors for categories
  function getCategoryColor(category: string): string {
    // Map of categories to colors
    const categoryColors: Record<string, string> = {
      [ExpenseCategory.RentOrMortgage]: "#0ea5e9", // Sky blue
      [ExpenseCategory.Utilities]: "#8b5cf6", // Violet
      [ExpenseCategory.InternetAndPhone]: "#06b6d4", // Cyan
      [ExpenseCategory.Insurance]: "#f59e0b", // Amber
      [ExpenseCategory.Groceries]: "#10b981", // Emerald
      [ExpenseCategory.Transportation]: "#f97316", // Orange
      [ExpenseCategory.DebtPayments]: "#ef4444", // Red
      [ExpenseCategory.SubscriptionsAndMemberships]: "#6366f1", // Indigo
      [ExpenseCategory.ChildcareOrTuition]: "#ec4899", // Pink
      [ExpenseCategory.MedicalAndHealth]: "#14b8a6", // Teal
      [ExpenseCategory.PersonalCareAndClothing]: "#a855f7", // Purple
      [ExpenseCategory.SavingsAndInvestments]: "#22c55e", // Green
      [ExpenseCategory.EntertainmentAndDining]: "#f43f5e", // Rose
      [ExpenseCategory.PetExpenses]: "#84cc16", // Lime
      [ExpenseCategory.Miscellaneous]: "#78716c", // Stone
    };
    
    return categoryColors[category] || "#9ca3af"; // Default to gray
  }
  
  // Handle form submission
  function onSubmit(values: QuickBudgetFormValues) {
    setBudget(values.category, values.limit);
    form.reset({ category: undefined, limit: undefined });
    setIsFormVisible(false);
  }
  
  return (
    <div className="space-y-4">
      {/* Budget summary and actions */}
      <div className="flex flex-col md:flex-row gap-4">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Budget Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Budget:</span>
                <span className="font-medium">{formatCurrency(totalBudgetLimit)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Spent:</span>
                <span className="font-medium">{formatCurrency(totalSpent)}</span>
              </div>
              <div className="flex justify-between">
                <span>Remaining:</span>
                <span className="font-medium">{formatCurrency(remainingBudget)}</span>
              </div>
              <div className="flex justify-between">
                <span>Monthly Income:</span>
                <span className="font-medium">{formatCurrency(totalIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span>Unbudgeted:</span>
                <span className="font-medium">{formatCurrency(unbudgeted)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Quick budget form */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Quick Budget</CardTitle>
          </CardHeader>
          <CardContent>
            {isFormVisible ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(ExpenseCategory).map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Limit</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setIsFormVisible(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      <Save className="mr-2 h-4 w-4" />
                      Save Budget
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="flex flex-col items-center justify-center h-32">
                <p className="text-sm text-muted-foreground mb-4">
                  Quickly add or update a budget category
                </p>
                <Button onClick={() => setIsFormVisible(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Budget Item
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Pie charts section */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Budget Visualizations</CardTitle>
          <div className="flex space-x-2 mt-2">
            <Button 
              variant={pieView === "category" ? "default" : "outline"}
              size="sm"
              onClick={() => setPieView("category")}
            >
              By Category
            </Button>
            <Button 
              variant={pieView === "status" ? "default" : "outline"}
              size="sm"
              onClick={() => setPieView("status")}
            >
              Spent vs Remaining
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieView === "category" ? budgetByCategory : budgetStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {(pieView === "category" ? budgetByCategory : budgetStatusData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Legend layout="vertical" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="text-sm text-muted-foreground mt-4 text-center">
            {pieView === "category" 
              ? "Budget allocation by category" 
              : "Budget spent vs remaining balance"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}