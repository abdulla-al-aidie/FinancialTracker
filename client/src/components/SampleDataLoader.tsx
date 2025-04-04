import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFinance } from "@/contexts/FinanceContext";
import { 
  generateSampleIncomes, 
  generateSampleExpenses, 
  generateSampleBudgets, 
  generateSampleGoals,
  updateGoalProgress
} from "@/utils/sampleData";

export default function SampleDataLoader() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const {
    months,
    addMonth,
    setActiveMonth,
    addIncome,
    addExpense,
    updateBudget,
    goals,
    addGoal,
    updateGoal,
  } = useFinance();
  
  // Check if we already have January through April
  const hasRequiredMonths = () => {
    const requiredMonths = ['2023-01', '2023-02', '2023-03', '2023-04'];
    return requiredMonths.every(month => months.some(m => m.id === month));
  };
  
  // Load sample data for all months
  const loadSampleData = async () => {
    setLoading(true);
    
    try {
      // Define sample months
      const sampleMonths = [
        { id: '2023-01', name: 'January 2023' },
        { id: '2023-02', name: 'February 2023' },
        { id: '2023-03', name: 'March 2023' },
        { id: '2023-04', name: 'April 2023' }
      ];
      
      // Add months if they don't exist
      for (const month of sampleMonths) {
        if (!months.some(m => m.id === month.id)) {
          addMonth(month.id);
          await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        }
      }
      
      // Generate sample goals (same for all months)
      const sampleGoals = generateSampleGoals();
      
      // Add goals if they don't exist
      if (goals.length === 0) {
        for (const goal of sampleGoals) {
          const { id, ...goalWithoutId } = goal;
          addGoal(goalWithoutId);
          await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        }
      }
      
      // For each sample month, add income and expenses data
      for (let i = 0; i < sampleMonths.length; i++) {
        const monthId = sampleMonths[i].id;
        
        // Set the active month before adding data to ensure we're updating the correct month
        setActiveMonth(monthId);
        
        // Add a short delay to ensure active month switch has processed
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Generate sample incomes
        const incomes = generateSampleIncomes(monthId);
        for (const income of incomes) {
          const { id, ...incomeWithoutId } = income;
          addIncome(incomeWithoutId);
          await new Promise(resolve => setTimeout(resolve, 50)); 
        }
        
        // Generate sample expenses
        const expenses = generateSampleExpenses(monthId);
        for (const expense of expenses) {
          const { id, ...expenseWithoutId } = expense;
          addExpense(expenseWithoutId);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Generate sample budgets based on expenses
        const budgets = generateSampleBudgets(expenses);
        for (const budget of budgets) {
          updateBudget(budget);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Update goal progress based on month index
        if (goals.length > 0) {
          const updatedGoals = updateGoalProgress(goals, i);
          for (const goal of updatedGoals) {
            updateGoal(goal);
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      }
      
      // Set the active month back to April 2023
      setActiveMonth('2023-04');
      
      toast({
        title: "Sample Data Added",
        description: "Sample data for January through April has been loaded successfully!",
        variant: "default"
      });
    } catch (error) {
      console.error("Error loading sample data:", error);
      toast({
        title: "Error",
        description: "An error occurred while loading sample data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Button
      variant="outline"
      onClick={loadSampleData}
      disabled={loading || hasRequiredMonths()}
    >
      {loading ? "Loading..." : hasRequiredMonths() ? "Sample Data Loaded" : "Load Sample Data"}
    </Button>
  );
}