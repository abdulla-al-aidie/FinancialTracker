import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  Income, 
  Expense, 
  Budget, 
  Goal, 
  Debt, 
  Recommendation, 
  Alert, 
  Scenario,
  ExpenseCategory,
  GoalType,
  UserProfile
} from "../types/finance";

// Default user profile
const DEFAULT_USER_PROFILE: UserProfile = {
  name: "",
  email: "",
  preferredCurrency: "USD",
  goalPreference: GoalType.Saving,
  notificationsEnabled: true
};

// Finance context type definition
interface FinanceContextType {
  // User profile
  userProfile: UserProfile;
  updateUserProfile: (profile: UserProfile) => void;
  
  // Income
  incomes: Income[];
  addIncome: (income: Omit<Income, "id">) => void;
  updateIncome: (income: Income) => void;
  deleteIncome: (id: number) => void;
  
  // Expenses
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, "id">) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: number) => void;
  
  // Budgets
  budgets: Budget[];
  setBudget: (category: ExpenseCategory, limit: number) => void;
  updateBudget: (budget: Budget) => void;
  
  // Goals
  goals: Goal[];
  addGoal: (goal: Omit<Goal, "id" | "currentAmount">) => void;
  updateGoal: (goal: Goal) => void;
  deleteGoal: (id: number) => void;
  
  // Debts
  debts: Debt[];
  addDebt: (debt: Omit<Debt, "id">) => void;
  updateDebt: (debt: Debt) => void;
  deleteDebt: (id: number) => void;
  
  // Recommendations
  recommendations: Recommendation[];
  markRecommendationAsRead: (id: number) => void;
  
  // Alerts
  alerts: Alert[];
  markAlertAsRead: (id: number) => void;
  clearAllAlerts: () => void;
  
  // Scenarios
  scenarios: Scenario[];
  addScenario: (scenario: Omit<Scenario, "id">) => void;
  updateScenario: (scenario: Scenario) => void;
  deleteScenario: (id: number) => void;
  
  // Summary data
  totalIncome: number;
  totalExpenses: number;
  netCashflow: number;
  savingsRate: number;
  
  // Helper functions
  categorizeExpense: (description: string) => ExpenseCategory;
  generateRecommendations: () => void;
  checkBudgetAlerts: () => void;
}

// Create context
const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// Provider component
export function FinanceProvider({ children }: { children: ReactNode }) {
  // State for all financial data
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  
  // Summary calculations
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [netCashflow, setNetCashflow] = useState(0);
  const [savingsRate, setSavingsRate] = useState(0);
  
  const { toast } = useToast();
  
  // Load data from localStorage on initial render
  useEffect(() => {
    const savedUserProfile = localStorage.getItem("userProfile");
    const savedIncomes = localStorage.getItem("incomes");
    const savedExpenses = localStorage.getItem("expenses");
    const savedBudgets = localStorage.getItem("budgets");
    const savedGoals = localStorage.getItem("goals");
    const savedDebts = localStorage.getItem("debts");
    const savedScenarios = localStorage.getItem("scenarios");
    
    if (savedUserProfile) setUserProfile(JSON.parse(savedUserProfile));
    if (savedIncomes) setIncomes(JSON.parse(savedIncomes));
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
    if (savedBudgets) setBudgets(JSON.parse(savedBudgets));
    if (savedGoals) setGoals(JSON.parse(savedGoals));
    if (savedDebts) setDebts(JSON.parse(savedDebts));
    if (savedScenarios) setScenarios(JSON.parse(savedScenarios));
    
    // Generate initial recommendations and alerts
    setTimeout(() => {
      generateInitialRecommendations();
      checkBudgetAlerts();
    }, 1000);
  }, []);
  
  // Recalculate summary data when income or expenses change
  useEffect(() => {
    calculateSummaryData();
  }, [incomes, expenses]);
  
  // Calculate summary data
  const calculateSummaryData = () => {
    // Calculate total income
    const incomeTotal = incomes.reduce((sum, income) => sum + income.amount, 0);
    setTotalIncome(incomeTotal);
    
    // Calculate total expenses
    const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    setTotalExpenses(expenseTotal);
    
    // Calculate net cashflow
    const cashflow = incomeTotal - expenseTotal;
    setNetCashflow(cashflow);
    
    // Calculate savings rate
    const rate = incomeTotal > 0 ? (cashflow / incomeTotal) * 100 : 0;
    setSavingsRate(rate);
  };
  
  // Generate initial recommendations based on data
  const generateInitialRecommendations = () => {
    const newRecommendations: Recommendation[] = [];
    
    // If expenses exceed income
    if (totalExpenses > totalIncome && expenses.length > 0) {
      newRecommendations.push({
        id: Date.now(),
        type: "Budget Alert",
        description: "Your expenses exceed your income. Consider reducing spending in non-essential categories.",
        impact: "Improve cashflow by $" + (totalExpenses - totalIncome).toFixed(2) + " monthly",
        dateGenerated: new Date().toISOString(),
        isRead: false
      });
    }
    
    // If savings rate is low
    if (savingsRate < 20 && totalIncome > 0) {
      newRecommendations.push({
        id: Date.now() + 1,
        type: "Savings Tip",
        description: "Your current savings rate is below the recommended 20%. Try to increase income or reduce expenses.",
        impact: "Reaching a 20% savings rate would mean saving $" + (totalIncome * 0.2).toFixed(2) + " monthly",
        dateGenerated: new Date().toISOString(),
        isRead: false
      });
    }
    
    // Add the new recommendations
    setRecommendations(prev => [...prev, ...newRecommendations]);
  };
  
  // Generate AI recommendations (placeholder for future ML integration)
  const generateRecommendations = () => {
    // This would be replaced with actual AI/ML analysis
    const newRecommendation: Recommendation = {
      id: Date.now(),
      type: "Smart Suggestion",
      description: "Based on your spending patterns, you could save more by reducing entertainment expenses.",
      impact: "Potential monthly savings: $100",
      dateGenerated: new Date().toISOString(),
      isRead: false
    };
    
    setRecommendations(prev => [...prev, newRecommendation]);
    
    toast({
      title: "New recommendation available",
      description: "We've generated a new financial insight for you.",
      variant: "default"
    });
  };
  
  // Check for budget alerts
  const checkBudgetAlerts = () => {
    const newAlerts: Alert[] = [];
    
    // Check each budget category
    budgets.forEach(budget => {
      const categoryExpenses = expenses.filter(exp => exp.category === budget.category);
      const totalSpent = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      // If over 80% of budget used, create alert
      if (totalSpent >= budget.limit * 0.8) {
        newAlerts.push({
          id: Date.now() + Math.random(),
          type: "Budget Warning",
          message: `You've spent ${Math.round((totalSpent / budget.limit) * 100)}% of your ${budget.category} budget`,
          date: new Date().toISOString(),
          isRead: false
        });
      }
    });
    
    if (newAlerts.length > 0) {
      setAlerts(prev => [...prev, ...newAlerts]);
      
      toast({
        title: "Budget Alert",
        description: `You're approaching or exceeding budget limits in ${newAlerts.length} categories.`,
        variant: "destructive"
      });
    }
  };
  
  // Simple ML-based expense categorization (placeholder)
  const categorizeExpense = (description: string): ExpenseCategory => {
    description = description.toLowerCase();
    
    // Simple keyword matching (would be replaced by a more sophisticated ML model)
    if (description.includes("rent") || description.includes("mortgage") || description.includes("house"))
      return ExpenseCategory.Housing;
      
    if (description.includes("car") || description.includes("gas") || description.includes("uber") || description.includes("lyft"))
      return ExpenseCategory.Transportation;
      
    if (description.includes("grocery") || description.includes("restaurant") || description.includes("food"))
      return ExpenseCategory.Food;
      
    if (description.includes("doctor") || description.includes("hospital") || description.includes("medicine"))
      return ExpenseCategory.Healthcare;
      
    if (description.includes("insurance"))
      return ExpenseCategory.Insurance;
      
    if (description.includes("loan") || description.includes("debt") || description.includes("credit"))
      return ExpenseCategory.Debt;
      
    if (description.includes("movie") || description.includes("entertainment") || description.includes("game"))
      return ExpenseCategory.Entertainment;
      
    if (description.includes("gift") || description.includes("donation") || description.includes("charity"))
      return ExpenseCategory.Gifts;
      
    if (description.includes("course") || description.includes("tuition") || description.includes("book"))
      return ExpenseCategory.Education;
      
    // Default to miscellaneous if no match
    return ExpenseCategory.Miscellaneous;
  };
  
  // Income management
  const addIncome = (income: Omit<Income, "id">) => {
    const newIncome = { ...income, id: Date.now() };
    const updatedIncomes = [...incomes, newIncome];
    setIncomes(updatedIncomes);
    localStorage.setItem("incomes", JSON.stringify(updatedIncomes));
    
    toast({
      title: "Income Added",
      description: "Your income has been successfully recorded.",
      variant: "default"
    });
  };
  
  const updateIncome = (income: Income) => {
    const updatedIncomes = incomes.map(inc => inc.id === income.id ? income : inc);
    setIncomes(updatedIncomes);
    localStorage.setItem("incomes", JSON.stringify(updatedIncomes));
    
    toast({
      title: "Income Updated",
      description: "Your income has been successfully updated.",
      variant: "default"
    });
  };
  
  const deleteIncome = (id: number) => {
    const updatedIncomes = incomes.filter(inc => inc.id !== id);
    setIncomes(updatedIncomes);
    localStorage.setItem("incomes", JSON.stringify(updatedIncomes));
    
    toast({
      title: "Income Deleted",
      description: "Your income has been successfully removed.",
      variant: "default"
    });
  };
  
  // Expense management
  const addExpense = (expense: Omit<Expense, "id">) => {
    const newExpense = { ...expense, id: Date.now() };
    const updatedExpenses = [...expenses, newExpense];
    setExpenses(updatedExpenses);
    localStorage.setItem("expenses", JSON.stringify(updatedExpenses));
    
    // Update budget spent amount
    updateBudgetSpending();
    
    toast({
      title: "Expense Added",
      description: "Your expense has been successfully recorded.",
      variant: "default"
    });
    
    // Check for budget alerts after adding expense
    checkBudgetAlerts();
  };
  
  const updateExpense = (expense: Expense) => {
    const updatedExpenses = expenses.map(exp => exp.id === expense.id ? expense : exp);
    setExpenses(updatedExpenses);
    localStorage.setItem("expenses", JSON.stringify(updatedExpenses));
    
    // Update budget spent amount
    updateBudgetSpending();
    
    toast({
      title: "Expense Updated",
      description: "Your expense has been successfully updated.",
      variant: "default"
    });
    
    // Check for budget alerts after updating expense
    checkBudgetAlerts();
  };
  
  const deleteExpense = (id: number) => {
    const updatedExpenses = expenses.filter(exp => exp.id !== id);
    setExpenses(updatedExpenses);
    localStorage.setItem("expenses", JSON.stringify(updatedExpenses));
    
    // Update budget spent amount
    updateBudgetSpending();
    
    toast({
      title: "Expense Deleted",
      description: "Your expense has been successfully removed.",
      variant: "default"
    });
  };
  
  // Budget management
  const setBudget = (category: ExpenseCategory, limit: number) => {
    // Check if budget already exists for this category
    const existingBudgetIndex = budgets.findIndex(b => b.category === category);
    
    if (existingBudgetIndex >= 0) {
      // Update existing budget
      const updatedBudgets = [...budgets];
      updatedBudgets[existingBudgetIndex] = { 
        ...updatedBudgets[existingBudgetIndex], 
        limit 
      };
      setBudgets(updatedBudgets);
      localStorage.setItem("budgets", JSON.stringify(updatedBudgets));
    } else {
      // Create new budget
      const newBudget: Budget = {
        category,
        limit,
        spent: 0
      };
      const updatedBudgets = [...budgets, newBudget];
      setBudgets(updatedBudgets);
      localStorage.setItem("budgets", JSON.stringify(updatedBudgets));
    }
    
    // Update budget spent amount
    updateBudgetSpending();
    
    toast({
      title: "Budget Updated",
      description: `Budget for ${category} has been set to $${limit}`,
      variant: "default"
    });
    
    // Check for budget alerts after setting/updating budget
    checkBudgetAlerts();
  };
  
  const updateBudget = (budget: Budget) => {
    const updatedBudgets = budgets.map(b => 
      b.category === budget.category ? budget : b
    );
    setBudgets(updatedBudgets);
    localStorage.setItem("budgets", JSON.stringify(updatedBudgets));
    
    toast({
      title: "Budget Updated",
      description: `Budget for ${budget.category} has been updated`,
      variant: "default"
    });
    
    // Check for budget alerts after updating budget
    checkBudgetAlerts();
  };
  
  // Update the spent amount for all budgets
  const updateBudgetSpending = () => {
    // Calculate the spent amount for each budget category
    const updatedBudgets = budgets.map(budget => {
      const categoryExpenses = expenses.filter(exp => exp.category === budget.category);
      const spent = categoryExpenses.reduce((total, exp) => total + exp.amount, 0);
      return { ...budget, spent };
    });
    
    setBudgets(updatedBudgets);
    localStorage.setItem("budgets", JSON.stringify(updatedBudgets));
  };
  
  // Goal management
  const addGoal = (goal: Omit<Goal, "id" | "currentAmount">) => {
    const newGoal: Goal = { 
      ...goal, 
      id: Date.now(),
      currentAmount: 0
    };
    const updatedGoals = [...goals, newGoal];
    setGoals(updatedGoals);
    localStorage.setItem("goals", JSON.stringify(updatedGoals));
    
    toast({
      title: "Goal Created",
      description: `Your ${goal.type} goal "${goal.name}" has been created`,
      variant: "default"
    });
  };
  
  const updateGoal = (goal: Goal) => {
    const updatedGoals = goals.map(g => g.id === goal.id ? goal : g);
    setGoals(updatedGoals);
    localStorage.setItem("goals", JSON.stringify(updatedGoals));
    
    toast({
      title: "Goal Updated",
      description: `Your goal "${goal.name}" has been updated`,
      variant: "default"
    });
  };
  
  const deleteGoal = (id: number) => {
    const updatedGoals = goals.filter(g => g.id !== id);
    setGoals(updatedGoals);
    localStorage.setItem("goals", JSON.stringify(updatedGoals));
    
    toast({
      title: "Goal Deleted",
      description: "Your goal has been deleted",
      variant: "default"
    });
  };
  
  // Debt management
  const addDebt = (debt: Omit<Debt, "id">) => {
    const newDebt = { ...debt, id: Date.now() };
    const updatedDebts = [...debts, newDebt];
    setDebts(updatedDebts);
    localStorage.setItem("debts", JSON.stringify(updatedDebts));
    
    toast({
      title: "Debt Added",
      description: `Your debt "${debt.name}" has been added`,
      variant: "default"
    });
  };
  
  const updateDebt = (debt: Debt) => {
    const updatedDebts = debts.map(d => d.id === debt.id ? debt : d);
    setDebts(updatedDebts);
    localStorage.setItem("debts", JSON.stringify(updatedDebts));
    
    toast({
      title: "Debt Updated",
      description: `Your debt "${debt.name}" has been updated`,
      variant: "default"
    });
  };
  
  const deleteDebt = (id: number) => {
    const updatedDebts = debts.filter(d => d.id !== id);
    setDebts(updatedDebts);
    localStorage.setItem("debts", JSON.stringify(updatedDebts));
    
    toast({
      title: "Debt Deleted",
      description: "Your debt has been deleted",
      variant: "default"
    });
  };
  
  // Recommendation management
  const markRecommendationAsRead = (id: number) => {
    const updatedRecommendations = recommendations.map(rec => 
      rec.id === id ? { ...rec, isRead: true } : rec
    );
    setRecommendations(updatedRecommendations);
  };
  
  // Alert management
  const markAlertAsRead = (id: number) => {
    const updatedAlerts = alerts.map(alert => 
      alert.id === id ? { ...alert, isRead: true } : alert
    );
    setAlerts(updatedAlerts);
  };
  
  const clearAllAlerts = () => {
    setAlerts([]);
  };
  
  // Scenario management
  const addScenario = (scenario: Omit<Scenario, "id">) => {
    const newScenario = { ...scenario, id: Date.now() };
    const updatedScenarios = [...scenarios, newScenario];
    setScenarios(updatedScenarios);
    localStorage.setItem("scenarios", JSON.stringify(updatedScenarios));
    
    toast({
      title: "Scenario Created",
      description: `Your what-if scenario "${scenario.name}" has been created`,
      variant: "default"
    });
  };
  
  const updateScenario = (scenario: Scenario) => {
    const updatedScenarios = scenarios.map(s => s.id === scenario.id ? scenario : s);
    setScenarios(updatedScenarios);
    localStorage.setItem("scenarios", JSON.stringify(updatedScenarios));
    
    toast({
      title: "Scenario Updated",
      description: `Your scenario "${scenario.name}" has been updated`,
      variant: "default"
    });
  };
  
  const deleteScenario = (id: number) => {
    const updatedScenarios = scenarios.filter(s => s.id !== id);
    setScenarios(updatedScenarios);
    localStorage.setItem("scenarios", JSON.stringify(updatedScenarios));
    
    toast({
      title: "Scenario Deleted",
      description: "Your scenario has been deleted",
      variant: "default"
    });
  };
  
  // User profile management
  const updateUserProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem("userProfile", JSON.stringify(profile));
    
    toast({
      title: "Profile Updated",
      description: "Your profile has been updated",
      variant: "default"
    });
  };
  
  return (
    <FinanceContext.Provider
      value={{
        userProfile,
        updateUserProfile,
        incomes,
        addIncome,
        updateIncome,
        deleteIncome,
        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
        budgets,
        setBudget,
        updateBudget,
        goals,
        addGoal,
        updateGoal,
        deleteGoal,
        debts,
        addDebt,
        updateDebt,
        deleteDebt,
        recommendations,
        markRecommendationAsRead,
        alerts,
        markAlertAsRead,
        clearAllAlerts,
        scenarios,
        addScenario,
        updateScenario,
        deleteScenario,
        totalIncome,
        totalExpenses,
        netCashflow,
        savingsRate,
        categorizeExpense,
        generateRecommendations,
        checkBudgetAlerts
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

// Custom hook for using the finance context
export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error("useFinance must be used within a FinanceProvider");
  }
  return context;
}