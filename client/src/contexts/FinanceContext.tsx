import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  generateFinancialInsights,
  prioritizeGoals,
  generateGoalRecommendations,
  analyzeSpendingPatterns
} from "@/lib/openai";
import { FALLBACK_INSIGHTS } from "@/components/FallbackRecommendations";
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
  UserProfile,
  MonthData
} from "../types/finance";

// Default user profile
const DEFAULT_USER_PROFILE: UserProfile = {
  name: "",
  email: "",
  preferredCurrency: "USD",
  goalPreference: GoalType.Saving,
  notificationsEnabled: true,
  emailNotifications: {
    budgetAlerts: true,
    paymentReminders: true,
    goalProgress: true,
    monthlyReports: false
  },
  alertPreferences: {
    budgetWarningThreshold: 80, // Alert at 80% of budget
    lowBalanceThreshold: 100, // Alert when balance falls below $100
    upcomingPaymentDays: 3, // Alert 3 days before payment due
    instantAlerts: true // Show alerts immediately
  }
};

// Finance context type definition
interface FinanceContextType {
  // User profile
  userProfile: UserProfile;
  updateUserProfile: (profile: UserProfile) => void;
  
  // Month Selection
  months: MonthData[];
  activeMonth: string; // YYYY-MM format
  setActiveMonth: (monthId: string) => void;
  addMonth: (monthName: string) => void;
  
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
  generateRecommendations: () => Promise<void>;
  checkBudgetAlerts: () => void;
  compareWithPreviousMonth: () => { incomeChange: number; expenseChange: number; savingsChange: number };
  
  // Month data propagation
  updateFutureMonths: () => Promise<void>;
  
  // AI Goal Optimization features
  prioritizeGoalsWithAI: () => Promise<void>;
  getGoalRecommendations: (goalId: number) => Promise<{
    description: string;
    potentialImpact: string;
    estimatedTimeReduction: string;
    requiredActions: string[];
  }[]>;
  analyzeSpendingForGoals: () => Promise<{
    optimizationAreas: Array<{
      category: string;
      currentSpending: number;
      recommendedReduction: number;
      potentialSavings: number;
      specificSuggestions: string[];
    }>;
    projectedImpact: {
      newSavingsRate: number;
      monthlyIncrease: number;
      yearlyIncrease: number;
    };
  }>;
}

// Create context
const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// Helper function to get current month in YYYY-MM format
const getCurrentMonthId = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Helper function to get month name
const getMonthName = (monthId: string): string => {
  const [year, month] = monthId.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

// Provider component
export function FinanceProvider({ children }: { children: ReactNode }) {
  // State for all financial data
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  
  // Month data
  const [months, setMonths] = useState<MonthData[]>(() => {
    // Initialize with current month
    const currentMonthId = getCurrentMonthId();
    return [
      { 
        id: currentMonthId, 
        name: getMonthName(currentMonthId),
        isActive: true
      }
    ];
  });
  const [activeMonth, setActiveMonth] = useState<string>(getCurrentMonthId());
  
  // All financial data is organized by month
  const [allIncomes, setAllIncomes] = useState<Record<string, Income[]>>({});
  const [allExpenses, setAllExpenses] = useState<Record<string, Expense[]>>({});
  const [allBudgets, setAllBudgets] = useState<Record<string, Budget[]>>({});
  const [allGoals, setAllGoals] = useState<Record<string, Goal[]>>({});  // Month-specific goals
  const [allDebts, setAllDebts] = useState<Record<string, Debt[]>>({});  // Month-specific debts
  
  // These are still shared across all months
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  
  // Summary calculations
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [netCashflow, setNetCashflow] = useState(0);
  const [savingsRate, setSavingsRate] = useState(0);
  
  const { toast } = useToast();
  
  // Computed properties for current month's data
  const incomes = allIncomes[activeMonth] || [];
  const expenses = allExpenses[activeMonth] || [];
  const budgets = allBudgets[activeMonth] || [];
  const goals = allGoals[activeMonth] || [];
  const debts = allDebts[activeMonth] || [];
  
  // Load data from localStorage on initial render
  useEffect(() => {
    const savedUserProfile = localStorage.getItem("userProfile");
    const savedGoals = localStorage.getItem("goals");
    const savedDebts = localStorage.getItem("debts");
    const savedScenarios = localStorage.getItem("scenarios");
    const savedMonths = localStorage.getItem("months");
    
    // Load shared data that persists across months
    if (savedUserProfile) setUserProfile(JSON.parse(savedUserProfile));
    
    // Initialize goals and debts records
    const goalsRecord: Record<string, Goal[]> = {};
    const debtsRecord: Record<string, Debt[]> = {};
    
    if (savedGoals) {
      // Parse the goals and ensure they all have a priority
      const loadedGoals = JSON.parse(savedGoals);
      const goalsWithPriority = loadedGoals.map((goal: Goal) => ({
        ...goal,
        priority: goal.priority !== undefined ? goal.priority : 5 // Set default priority if missing
      }));
      
      // Initialize goals for the current month
      goalsRecord[activeMonth] = goalsWithPriority;
      setAllGoals(goalsRecord);
      
      // Save back to ensure all goals have priorities (kept for backward compatibility)
      localStorage.setItem("goals", JSON.stringify(goalsWithPriority));
    }
    
    if (savedDebts) {
      const loadedDebts = JSON.parse(savedDebts);
      
      // Initialize debts for the current month
      debtsRecord[activeMonth] = loadedDebts;
      setAllDebts(debtsRecord);
      
      // Keep a copy in the old format for backward compatibility
      localStorage.setItem("debts", JSON.stringify(loadedDebts));
    }
    if (savedScenarios) setScenarios(JSON.parse(savedScenarios));
    
    // Load months data or initialize with current month if none exists
    if (savedMonths) {
      const parsedMonths = JSON.parse(savedMonths);
      setMonths(parsedMonths);
      
      // Find active month
      const activeMonthData = parsedMonths.find((m: MonthData) => m.isActive);
      if (activeMonthData) {
        setActiveMonth(activeMonthData.id);
      }
    } else {
      // Save the initialized current month
      localStorage.setItem("months", JSON.stringify(months));
    }
    
    // Load month-specific data for active month
    const monthId = activeMonth;
    const savedMonthIncomes = localStorage.getItem(`incomes_${monthId}`);
    const savedMonthExpenses = localStorage.getItem(`expenses_${monthId}`);
    const savedMonthBudgets = localStorage.getItem(`budgets_${monthId}`);
    
    // Initialize month data records
    const incomesRecord: Record<string, Income[]> = {};
    const expensesRecord: Record<string, Expense[]> = {};
    const budgetsRecord: Record<string, Budget[]> = {};
    
    if (savedMonthIncomes) {
      incomesRecord[monthId] = JSON.parse(savedMonthIncomes);
    }
    
    if (savedMonthExpenses) {
      expensesRecord[monthId] = JSON.parse(savedMonthExpenses);
    }
    
    if (savedMonthBudgets) {
      budgetsRecord[monthId] = JSON.parse(savedMonthBudgets);
    }
    
    // Set state with loaded data
    setAllIncomes(incomesRecord);
    setAllExpenses(expensesRecord);
    setAllBudgets(budgetsRecord);
    
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
  
  // Generate AI recommendations using OpenAI
  // We import FALLBACK_INSIGHTS from FallbackRecommendations component

  const generateRecommendations = async () => {
    try {
      // Prepare data for the OpenAI API
      const topExpenseCategories = Object.values(ExpenseCategory).map(category => {
        const categoryExpenses = expenses.filter(exp => exp.category === category);
        const amount = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        return { category, amount };
      })
      .filter(category => category.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
      
      const overBudgetCategories = budgets
        .filter(budget => budget.spent > budget.limit)
        .map(budget => budget.category);
      
      const debtTotal = debts.reduce((sum, debt) => sum + debt.balance, 0);
      const avgInterestRate = debts.length > 0
        ? debts.reduce((sum, debt) => sum + debt.interestRate, 0) / debts.length
        : 0;
      
      let aiInsights;
      let usingFallback = false;
      
      try {
        // Call the improved OpenAI function for detailed insights
        aiInsights = await generateFinancialInsights({
          totalIncome,
          totalExpenses,
          netCashflow,
          savingsRate,
          topExpenseCategories,
          overBudgetCategories,
          debtTotal,
          averageInterestRate: avgInterestRate
        });
        
        // Check if the API returned an error response
        const hasError = aiInsights.some((insight: {type: string}) => 
          insight.type.includes("Error") || 
          insight.type.includes("Service Unavailable") ||
          insight.type.includes("API Configuration")
        );
        
        if (hasError) {
          console.log("OpenAI returned an error response, using fallback insights");
          aiInsights = FALLBACK_INSIGHTS;
          usingFallback = true;
        }
      } catch (error) {
        console.error("Error calling OpenAI API, using fallback insights:", error);
        aiInsights = FALLBACK_INSIGHTS;
        usingFallback = true;
      }
      
      // Convert insights to recommendations
      const newRecommendations: Recommendation[] = aiInsights.map((insight: {type: string; description: string; impact: string}) => ({
        id: Date.now() + Math.random() * 1000,
        type: insight.type,
        description: insight.description,
        impact: insight.impact,
        dateGenerated: new Date().toISOString(),
        isRead: false
      }));
      
      // Add the new recommendations
      if (newRecommendations.length > 0) {
        setRecommendations(prev => [...prev, ...newRecommendations]);
        
        if (usingFallback) {
          toast({
            title: `${newRecommendations.length} general recommendations available`,
            description: "We've provided general financial advice. Personalized AI insights are currently unavailable.",
            variant: "default"
          });
        } else {
          toast({
            title: `${newRecommendations.length} new recommendations available`,
            description: "We've generated detailed financial insights based on your data.",
            variant: "default"
          });
        }
      } else {
        toast({
          title: "Could not generate recommendations",
          description: "Please add more financial data for better insights.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error generating recommendations:", error);
      
      // Create fallback recommendations as a last resort
      const fallbackRecommendations: Recommendation[] = FALLBACK_INSIGHTS.map(insight => ({
        id: Date.now() + Math.random() * 1000,
        type: insight.type,
        description: insight.description,
        impact: insight.impact,
        dateGenerated: new Date().toISOString(),
        isRead: false
      }));
      
      setRecommendations(prev => [...prev, ...fallbackRecommendations]);
      
      toast({
        title: "Using general recommendations",
        description: "AI service is unavailable. We've provided general financial advice instead.",
        variant: "default"
      });
    }
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
    
    // Simple keyword matching for the new categories
    if (description.includes("rent") || description.includes("mortgage") || description.includes("apartment"))
      return ExpenseCategory.RentOrMortgage;
      
    if (description.includes("electricity") || description.includes("water") || description.includes("gas bill") || description.includes("utility"))
      return ExpenseCategory.Utilities;
      
    if (description.includes("internet") || description.includes("phone") || description.includes("wifi") || description.includes("cell"))
      return ExpenseCategory.InternetAndPhone;
      
    if (description.includes("insurance") || description.includes("coverage") || description.includes("policy"))
      return ExpenseCategory.Insurance;
      
    if (description.includes("grocery") || description.includes("supermarket") || description.includes("food") || description.includes("produce"))
      return ExpenseCategory.Groceries;
      
    if (description.includes("car") || description.includes("gas") || description.includes("uber") || description.includes("lyft") || description.includes("bus") || description.includes("train"))
      return ExpenseCategory.Transportation;
      
    if (description.includes("loan") || description.includes("debt") || description.includes("credit card") || description.includes("payment"))
      return ExpenseCategory.DebtPayments;
      
    if (description.includes("netflix") || description.includes("spotify") || description.includes("subscription") || description.includes("membership") || description.includes("gym"))
      return ExpenseCategory.SubscriptionsAndMemberships;
      
    if (description.includes("childcare") || description.includes("daycare") || description.includes("tuition") || description.includes("school"))
      return ExpenseCategory.ChildcareOrTuition;
      
    if (description.includes("doctor") || description.includes("hospital") || description.includes("medicine") || description.includes("medical") || description.includes("health"))
      return ExpenseCategory.MedicalAndHealth;
      
    if (description.includes("clothing") || description.includes("haircut") || description.includes("salon") || description.includes("personal care"))
      return ExpenseCategory.PersonalCareAndClothing;
      
    if (description.includes("savings") || description.includes("investment") || description.includes("stock") || description.includes("retirement"))
      return ExpenseCategory.SavingsAndInvestments;
      
    if (description.includes("restaurant") || description.includes("dining") || description.includes("movie") || description.includes("entertainment") || description.includes("concert"))
      return ExpenseCategory.EntertainmentAndDining;
      
    if (description.includes("pet") || description.includes("vet") || description.includes("dog") || description.includes("cat") || description.includes("animal"))
      return ExpenseCategory.PetExpenses;
      
    // Default to Miscellaneous
    return ExpenseCategory.Miscellaneous;
  };
  
  // Income management
  const addIncome = (income: Omit<Income, "id">) => {
    const newIncome = { ...income, id: Date.now() };
    const updatedIncomes = [...incomes, newIncome];
    
    // Update state with new income for current month
    setAllIncomes({
      ...allIncomes,
      [activeMonth]: updatedIncomes
    });
    
    // Save to localStorage
    localStorage.setItem(`incomes_${activeMonth}`, JSON.stringify(updatedIncomes));
    
    toast({
      title: "Income Added",
      description: "Your income has been successfully recorded.",
      variant: "default"
    });
  };
  
  const updateIncome = (income: Income) => {
    const updatedIncomes = incomes.map(inc => inc.id === income.id ? income : inc);
    
    // Update state with updated incomes for current month
    setAllIncomes({
      ...allIncomes,
      [activeMonth]: updatedIncomes
    });
    
    // Save to localStorage
    localStorage.setItem(`incomes_${activeMonth}`, JSON.stringify(updatedIncomes));
    
    toast({
      title: "Income Updated",
      description: "Your income has been successfully updated.",
      variant: "default"
    });
  };
  
  const deleteIncome = (id: number) => {
    const updatedIncomes = incomes.filter(inc => inc.id !== id);
    
    // Update state with filtered incomes for current month
    setAllIncomes({
      ...allIncomes,
      [activeMonth]: updatedIncomes
    });
    
    // Save to localStorage
    localStorage.setItem(`incomes_${activeMonth}`, JSON.stringify(updatedIncomes));
    
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
    
    // Update state with new expense for current month
    setAllExpenses({
      ...allExpenses,
      [activeMonth]: updatedExpenses
    });
    
    // Save to localStorage
    localStorage.setItem(`expenses_${activeMonth}`, JSON.stringify(updatedExpenses));
    
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
    
    // Update state with updated expenses for current month
    setAllExpenses({
      ...allExpenses,
      [activeMonth]: updatedExpenses
    });
    
    // Save to localStorage
    localStorage.setItem(`expenses_${activeMonth}`, JSON.stringify(updatedExpenses));
    
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
    
    // Update state with filtered expenses for current month
    setAllExpenses({
      ...allExpenses,
      [activeMonth]: updatedExpenses
    });
    
    // Save to localStorage
    localStorage.setItem(`expenses_${activeMonth}`, JSON.stringify(updatedExpenses));
    
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
      
      // Update state with updated budgets for current month
      setAllBudgets({
        ...allBudgets,
        [activeMonth]: updatedBudgets
      });
      
      // Save to localStorage
      localStorage.setItem(`budgets_${activeMonth}`, JSON.stringify(updatedBudgets));
    } else {
      // Create new budget
      const newBudget: Budget = {
        category,
        limit,
        spent: 0
      };
      const updatedBudgets = [...budgets, newBudget];
      
      // Update state with new budgets for current month
      setAllBudgets({
        ...allBudgets,
        [activeMonth]: updatedBudgets
      });
      
      // Save to localStorage
      localStorage.setItem(`budgets_${activeMonth}`, JSON.stringify(updatedBudgets));
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
    
    // Update state with updated budgets for current month
    setAllBudgets({
      ...allBudgets,
      [activeMonth]: updatedBudgets
    });
    
    // Save to localStorage
    localStorage.setItem(`budgets_${activeMonth}`, JSON.stringify(updatedBudgets));
    
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
    
    // Update state with updated budgets for current month
    setAllBudgets({
      ...allBudgets,
      [activeMonth]: updatedBudgets
    });
    
    // Save to localStorage
    localStorage.setItem(`budgets_${activeMonth}`, JSON.stringify(updatedBudgets));
  };
  
  // Goal management
  const addGoal = (goal: Omit<Goal, "id" | "currentAmount">) => {
    const newGoal: Goal = { 
      ...goal, 
      id: Date.now(),
      currentAmount: 0,
      priority: goal.priority || 5 // Set default priority to 5 (medium) if not provided
    };
    
    // Add goal to the current month 
    const updatedGoals = [...goals, newGoal];
    
    // Update the allGoals state with the new goal for the current month
    setAllGoals({
      ...allGoals,
      [activeMonth]: updatedGoals
    });
    
    // Save to localStorage (both month-specific and for backward compatibility)
    localStorage.setItem(`goals_${activeMonth}`, JSON.stringify(updatedGoals));
    localStorage.setItem("goals", JSON.stringify(updatedGoals)); // For backwards compatibility
    
    toast({
      title: "Goal Created",
      description: `Your ${goal.type} goal "${goal.name}" has been created`,
      variant: "default"
    });
  };
  
  const updateGoal = (goal: Goal) => {
    const updatedGoals = goals.map(g => g.id === goal.id ? goal : g);
    
    // Update the allGoals state with updated goals for the current month
    setAllGoals({
      ...allGoals,
      [activeMonth]: updatedGoals
    });
    
    // Save to localStorage (both month-specific and for backward compatibility)
    localStorage.setItem(`goals_${activeMonth}`, JSON.stringify(updatedGoals));
    localStorage.setItem("goals", JSON.stringify(updatedGoals)); // For backwards compatibility
    
    toast({
      title: "Goal Updated",
      description: `Your goal "${goal.name}" has been updated`,
      variant: "default"
    });
  };
  
  const deleteGoal = (id: number) => {
    const updatedGoals = goals.filter(g => g.id !== id);
    
    // Update the allGoals state with filtered goals for the current month
    setAllGoals({
      ...allGoals,
      [activeMonth]: updatedGoals
    });
    
    // Save to localStorage (both month-specific and for backward compatibility)
    localStorage.setItem(`goals_${activeMonth}`, JSON.stringify(updatedGoals));
    localStorage.setItem("goals", JSON.stringify(updatedGoals)); // For backwards compatibility
    
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
    
    // Update the allDebts state with new debt for the current month
    setAllDebts({
      ...allDebts, 
      [activeMonth]: updatedDebts
    });
    
    // Save to localStorage (both month-specific and for backward compatibility)
    localStorage.setItem(`debts_${activeMonth}`, JSON.stringify(updatedDebts));
    localStorage.setItem("debts", JSON.stringify(updatedDebts)); // For backwards compatibility
    
    toast({
      title: "Debt Added",
      description: `Your debt "${debt.name}" has been added`,
      variant: "default"
    });
  };
  
  const updateDebt = (debt: Debt) => {
    // Get the existing debt to compare changes
    const existingDebt = debts.find(d => d.id === debt.id);
    
    // Only process if we found the existing debt
    if (existingDebt) {
      // Check if payments were deleted (comparing totalPaid)
      if (debt.totalPaid < existingDebt.totalPaid) {
        // Reset monthly payments since we can't know which months were affected
        debt.monthlyPayments = {};
      }
      
      // If the debt's total paid changed but monthly payments are missing, initialize them
      if (!debt.monthlyPayments) {
        debt.monthlyPayments = {};
      }
    }
    
    // Update the debt in state
    const updatedDebts = debts.map(d => d.id === debt.id ? debt : d);
    
    // Update the allDebts state with updated debts for the current month
    setAllDebts({
      ...allDebts,
      [activeMonth]: updatedDebts
    });
    
    // Save to localStorage (both month-specific and for backward compatibility)
    localStorage.setItem(`debts_${activeMonth}`, JSON.stringify(updatedDebts));
    localStorage.setItem("debts", JSON.stringify(updatedDebts)); // For backwards compatibility
    
    toast({
      title: "Debt Updated",
      description: `Your debt "${debt.name}" has been updated`,
      variant: "default"
    });
  };
  
  const deleteDebt = (id: number) => {
    const updatedDebts = debts.filter(d => d.id !== id);
    
    // Update the allDebts state with filtered debts for the current month
    setAllDebts({
      ...allDebts,
      [activeMonth]: updatedDebts
    });
    
    // Save to localStorage (both month-specific and for backward compatibility)
    localStorage.setItem(`debts_${activeMonth}`, JSON.stringify(updatedDebts));
    localStorage.setItem("debts", JSON.stringify(updatedDebts)); // For backwards compatibility
    
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
  
  // Month management
  const setActiveMonthHandler = (monthId: string) => {
    // Update active month in state
    setActiveMonth(monthId);
    
    // Update months array to reflect active month
    const updatedMonths = months.map(month => ({
      ...month,
      isActive: month.id === monthId
    }));
    setMonths(updatedMonths);
    
    // Save updated months to localStorage
    localStorage.setItem("months", JSON.stringify(updatedMonths));
    
    // Check if we need to ensure debt and goal data exists for this month
    const sortedMonths = [...months.map(m => m.id)].sort();
    if (sortedMonths.length > 0) {
      // Find most recent previous month
      const previousMonths = sortedMonths.filter(m => m < monthId);
      const mostRecentMonth = previousMonths.length > 0 ? previousMonths[previousMonths.length - 1] : null;
      
      // If there's a previous month and this month doesn't have goals/debts, propagate them forward
      if (mostRecentMonth) {
        // Check if we need to copy goal/debt data
        const goalsExist = allGoals[monthId] && allGoals[monthId].length > 0;
        const debtsExist = allDebts[monthId] && allDebts[monthId].length > 0;
        
        if (!goalsExist || !debtsExist) {
          propagateMonthData(mostRecentMonth, monthId);
        }
      }
    }
    
    toast({
      title: "Month Changed",
      description: `You are now viewing data for ${getMonthName(monthId)}`,
      variant: "default"
    });
    
    // Force recalculation of summary data for the selected month
    calculateSummaryData();
  };
  
  const addMonthHandler = (monthName: string) => {
    const date = new Date(monthName);
    const monthId = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    // Check if month already exists
    if (months.some(m => m.id === monthId)) {
      toast({
        title: "Month Already Exists",
        description: `${getMonthName(monthId)} is already available`,
        variant: "destructive"
      });
      return;
    }
    
    // Add new month
    const newMonth: MonthData = {
      id: monthId,
      name: getMonthName(monthId),
      isActive: false
    };
    
    // Update months array
    const updatedMonths = [...months, newMonth];
    setMonths(updatedMonths);
    
    // Save updated months to localStorage
    localStorage.setItem("months", JSON.stringify(updatedMonths));
    
    // Find a previous month to copy data from
    const sortedMonths = [...months.map(m => m.id)].sort();
    if (sortedMonths.length > 0) {
      // Get the most recent month that comes before this new month
      const previousMonths = sortedMonths.filter(m => m < monthId);
      const mostRecentMonth = previousMonths.length > 0 ? previousMonths[previousMonths.length - 1] : null;
      
      if (mostRecentMonth) {
        // Use propagateMonthData to copy all relevant data from the previous month
        propagateMonthData(mostRecentMonth, monthId);
        
        // Also copy budgets but reset spent amount, since propagateMonthData doesn't handle budgets
        if (!allBudgets[monthId] && allBudgets[mostRecentMonth]) {
          const newBudgets = allBudgets[mostRecentMonth].map(budget => ({
            ...budget,
            spent: 0
          }));
          setAllBudgets({
            ...allBudgets,
            [monthId]: newBudgets
          });
          
          // Save to localStorage
          localStorage.setItem(`budgets_${monthId}`, JSON.stringify(newBudgets));
        }
      }
    }
    
    toast({
      title: "Month Added",
      description: `${getMonthName(monthId)} has been added to your tracking`,
      variant: "default"
    });
    
    // Set as active
    setActiveMonthHandler(monthId);
  };
  
  const compareWithPreviousMonth = () => {
    // Get the previous month
    const [year, month] = activeMonth.split('-').map(Number);
    let prevYear = year;
    let prevMonth = month - 1;
    
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear--;
    }
    
    const prevMonthId = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    
    // Get income and expenses for previous month
    const prevIncomes = allIncomes[prevMonthId] || [];
    const prevExpenses = allExpenses[prevMonthId] || [];
    
    // Calculate totals
    const prevTotalIncome = prevIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    const prevTotalExpenses = prevExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const prevSavings = prevTotalIncome - prevTotalExpenses;
    
    // Calculate changes
    const incomeChange = totalIncome - prevTotalIncome;
    const expenseChange = totalExpenses - prevTotalExpenses;
    const savingsChange = netCashflow - prevSavings;
    
    return { incomeChange, expenseChange, savingsChange };
  };

  // AI Goal Prioritization - Use AI to assess and assign priority rankings to goals
  const prioritizeGoalsWithAI = async () => {
    if (goals.length === 0) {
      toast({
        title: "No goals found",
        description: "Please add at least one financial goal to use AI prioritization.",
        variant: "destructive"
      });
      return;
    }

    try {
      toast({
        title: "Analyzing Financial Situation",
        description: "Our AI is analyzing your complete financial data to optimize your goals...",
        variant: "default"
      });

      // Prepare expense categories data for OpenAI API
      const topExpenseCategories = Object.values(ExpenseCategory).map(category => {
        const categoryExpenses = expenses.filter(exp => exp.category === category);
        const amount = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const percentOfTotalExpenses = totalExpenses > 0 
          ? Math.round((amount / totalExpenses) * 100) 
          : 0;
        return { category, amount, percentOfTotalExpenses };
      })
      .filter(category => category.amount > 0)
      .sort((a, b) => b.amount - a.amount);

      // Calculate debt total 
      const debtTotal = debts.reduce((sum, debt) => sum + debt.balance, 0);
      
      // Format income data
      const incomeData = incomes.map(income => ({
        type: income.type,
        amount: income.amount,
        description: income.description
      }));

      // Send comprehensive financial data to OpenAI for prioritization
      const priorityData = await prioritizeGoals({
        goals: goals.map(goal => ({
          id: goal.id,
          name: goal.name,
          type: goal.type,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          targetDate: goal.targetDate,
          description: goal.description
        })),
        financialSnapshot: {
          totalIncome,
          totalExpenses,
          savingsRate,
          debtTotal,
          monthlyNetCashflow: netCashflow
        },
        expenseBreakdown: topExpenseCategories,
        // Add debt and income data for more comprehensive analysis
        debts: debts.map(debt => ({
          name: debt.name,
          balance: debt.balance,
          interestRate: debt.interestRate,
          minimumPayment: debt.minimumPayment,
          priority: debt.priority,
          originalPrincipal: debt.originalPrincipal,
          totalPaid: debt.totalPaid
        })),
        income: incomeData
      });

      if (priorityData.length === 0) {
        toast({
          title: "Prioritization Failed",
          description: "We couldn't generate goal priorities at this time. Please try again later.",
          variant: "destructive"
        });
        return;
      }

      // Update goal priorities and store the reasoning for each goal
      const updatedGoals = goals.map(goal => {
        const priority = priorityData.find(p => p.goalId === goal.id);
        if (!priority) return goal;
        
        // Create a recommendation from the AI reasoning if provided
        const aiReasons = priority.reasoning ? [
          {
            id: Date.now(),
            description: priority.reasoning,
            potentialImpact: priority.priorityScore >= 8 ? "High" : 
                             priority.priorityScore >= 5 ? "Medium" : "Low",
            estimatedTimeReduction: "Optimized priority ranking",
            requiredActions: ["Follow the prioritization advice", "Focus on higher priority goals first"]
          }
        ] : [];
        
        // Merge with existing recommendations if any
        const combinedRecommendations = [
          ...aiReasons,
          ...(goal.aiRecommendations || [])
        ].slice(0, 5); // Keep up to 5 most recent recommendations
        
        return { 
          ...goal, 
          priority: priority.priorityScore,
          aiRecommendations: combinedRecommendations
        };
      });

      // Save updated goals to state and localStorage
      setAllGoals({
        ...allGoals,
        [activeMonth]: updatedGoals
      });
      localStorage.setItem(`goals_${activeMonth}`, JSON.stringify(updatedGoals));
      localStorage.setItem("goals", JSON.stringify(updatedGoals)); // For backwards compatibility

      toast({
        title: "Goals Prioritized",
        description: "Your financial goals have been prioritized based on comprehensive AI analysis of your entire financial situation.",
        variant: "default"
      });

    } catch (error) {
      console.error("Error prioritizing goals:", error);
      toast({
        title: "Prioritization Failed",
        description: "We encountered an error while analyzing your financial data. Please try again later.",
        variant: "destructive"
      });
    }
  };

  // Get AI recommendations for how to achieve a specific goal faster
  const getGoalRecommendations = async (goalId: number) => {
    const goal = goals.find(g => g.id === goalId);
    
    if (!goal) {
      toast({
        title: "Goal Not Found",
        description: "The selected goal could not be found.",
        variant: "destructive"
      });
      return [];
    }

    try {
      // Get the last 3 months of cashflow data for trends
      const [year, month] = activeMonth.split('-').map(Number);
      const cashflowTrend = [];
      
      for (let i = 0; i < 3; i++) {
        let targetYear = year;
        let targetMonth = month - i;
        
        while (targetMonth <= 0) {
          targetYear--;
          targetMonth += 12;
        }
        
        const monthId = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
        const monthIncomes = allIncomes[monthId] || [];
        const monthExpenses = allExpenses[monthId] || [];
        
        const monthlyIncome = monthIncomes.reduce((sum, income) => sum + income.amount, 0);
        const monthlyExpense = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        
        cashflowTrend.push({
          month: getMonthName(monthId),
          netAmount: monthlyIncome - monthlyExpense
        });
      }

      // Identify non-essential spending for optimization opportunities
      const essentialCategories = [
        ExpenseCategory.RentOrMortgage,
        ExpenseCategory.Utilities,
        ExpenseCategory.Groceries,
        ExpenseCategory.MedicalAndHealth,
        ExpenseCategory.Insurance,
        ExpenseCategory.ChildcareOrTuition,
        ExpenseCategory.DebtPayments
      ];
      
      const nonEssentialSpending = expenses
        .filter(exp => !essentialCategories.includes(exp.category))
        .reduce((sum, exp) => sum + exp.amount, 0);
      
      // Create category mappings for reducible vs non-reducible expenses
      const reducibleCategories = [
        ExpenseCategory.EntertainmentAndDining,
        ExpenseCategory.SubscriptionsAndMemberships,
        ExpenseCategory.PersonalCareAndClothing,
        ExpenseCategory.PetExpenses,
        ExpenseCategory.Miscellaneous
      ];
      
      const topExpenseCategories = Object.values(ExpenseCategory).map(category => {
        const categoryExpenses = expenses.filter(exp => exp.category === category);
        const amount = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        return { 
          category, 
          amount, 
          isReducible: reducibleCategories.includes(category)
        };
      })
      .filter(category => category.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

      // Call the OpenAI API for recommendations
      const recommendations = await generateGoalRecommendations({
        goal: {
          id: goal.id,
          name: goal.name,
          type: goal.type,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          targetDate: goal.targetDate,
          description: goal.description,
          priority: goal.priority || 5
        },
        financialData: {
          income: incomes.map(inc => ({ 
            source: inc.type, 
            amount: inc.amount 
          })),
          expenses: expenses.map(exp => ({
            category: exp.category,
            amount: exp.amount
          })),
          savingsRate,
          cashflowTrend
        },
        spendingInsights: {
          nonEssentialSpending,
          topExpenseCategories
        }
      });

      if (recommendations.length > 0) {
        // Update the goal with the recommendations
        const updatedGoals = goals.map(g => {
          if (g.id === goalId) {
            return {
              ...g,
              aiRecommendations: recommendations.map((rec, index) => ({
                id: Date.now() + index,
                description: rec.description,
                potentialImpact: rec.potentialImpact,
                estimatedTimeReduction: rec.estimatedTimeReduction,
                requiredActions: rec.requiredActions
              }))
            };
          }
          return g;
        });
        
        // Update the allGoals state with the updated goals for the current month
        setAllGoals({
          ...allGoals,
          [activeMonth]: updatedGoals
        });
        
        // Save to localStorage (both month-specific and for backward compatibility)
        localStorage.setItem(`goals_${activeMonth}`, JSON.stringify(updatedGoals));
        localStorage.setItem("goals", JSON.stringify(updatedGoals)); // For backwards compatibility
        
        toast({
          title: "Recommendations Generated",
          description: `We've generated ${recommendations.length} recommendations to help you achieve your goal faster.`,
          variant: "default"
        });
      } else {
        toast({
          title: "No Recommendations",
          description: "We couldn't generate recommendations at this time. Please try again later.",
          variant: "destructive"
        });
      }

      return recommendations;

    } catch (error) {
      console.error("Error generating goal recommendations:", error);
      toast({
        title: "Recommendation Generation Failed",
        description: "We encountered an error while generating recommendations. Please try again later.",
        variant: "destructive"
      });
      return [];
    }
  };

  // Analyze spending patterns to identify optimization opportunities for faster goal achievement
  const analyzeSpendingForGoals = async () => {
    if (expenses.length === 0) {
      toast({
        title: "No Expense Data",
        description: "Please add some expenses before analyzing spending patterns.",
        variant: "destructive"
      });
      return {
        optimizationAreas: [],
        projectedImpact: {
          newSavingsRate: 0,
          monthlyIncrease: 0,
          yearlyIncrease: 0
        }
      };
    }

    try {
      // Default target savings rate of 20% if current rate is below that
      const targetSavingsRate = savingsRate < 20 ? 20 : savingsRate + 5;
      
      const analysisResult = await analyzeSpendingPatterns({
        expenses: expenses.map(exp => ({
          category: exp.category,
          amount: exp.amount,
          date: exp.date,
          description: exp.description
        })),
        income: totalIncome,
        targetSavingsRate
      });

      if (analysisResult.optimizationAreas.length > 0) {
        toast({
          title: "Spending Analysis Complete",
          description: `We've identified ${analysisResult.optimizationAreas.length} areas where you can optimize spending.`,
          variant: "default"
        });
      } else {
        toast({
          title: "No Optimization Areas",
          description: "We couldn't identify any specific areas to optimize. Your spending appears well-balanced.",
          variant: "default"
        });
      }

      return analysisResult;

    } catch (error) {
      console.error("Error analyzing spending patterns:", error);
      toast({
        title: "Analysis Failed",
        description: "We encountered an error while analyzing your spending patterns. Please try again later.",
        variant: "destructive"
      });
      return {
        optimizationAreas: [],
        projectedImpact: {
          newSavingsRate: 0,
          monthlyIncrease: 0,
          yearlyIncrease: 0
        }
      };
    }
  };
  
  // Function to propagate data forward when switching months or creating new months
  const updateFutureMonths = async () => {
    // Get all months that come after the active month
    const futureMonths = months
      .filter(month => month.id > activeMonth)
      .map(month => month.id)
      .sort();
    
    if (futureMonths.length === 0) {
      toast({
        title: "No Future Months",
        description: "There are no future months to update. Add a new month first.",
        variant: "default"
      });
      return;
    }
    
    // For each future month, update it based on the active month
    for (const monthId of futureMonths) {
      propagateMonthData(activeMonth, monthId);
    }
    
    toast({
      title: "Future Months Updated",
      description: `Successfully updated ${futureMonths.length} future month(s) with current data.`,
      variant: "default"
    });
  };
  
  // Helper function to propagate data from one month to another
  const propagateMonthData = (sourceMonthId: string, targetMonthId: string) => {
    if (!sourceMonthId || !targetMonthId || sourceMonthId >= targetMonthId) {
      // Don't propagate to the past or the same month
      return;
    }
    
    // 1. Propagate Goals
    // Get source month goals
    const sourceGoals = allGoals[sourceMonthId] || [];
    // Get target month goals or initialize empty array
    const targetGoals = allGoals[targetMonthId] || [];
    
    // Calculate cumulative progress for each goal up to the source month (inclusive)
    const goalProgress: Record<number, number> = {};
    const allMonthIds = Object.keys(months.reduce((acc, month) => {
      acc[month.id] = true;
      return acc;
    }, {} as Record<string, boolean>)).sort();
    
    // Only consider months up to and including the source month
    const relevantMonthIds = allMonthIds.filter(monthId => monthId <= sourceMonthId);
    
    // For each goal in source month, calculate its total progress across all previous months
    sourceGoals.forEach(goal => {
      let totalProgress = 0;
      
      // Sum up progress from all relevant months (only those up to source month)
      if (goal.monthlyProgress) {
        relevantMonthIds.forEach(monthId => {
          if (goal.monthlyProgress && goal.monthlyProgress[monthId]) {
            totalProgress += goal.monthlyProgress[monthId];
          }
        });
      }
      
      goalProgress[goal.id] = totalProgress;
    });
    
    // For each goal in source month, update or create in target month
    const updatedTargetGoals = sourceGoals.map(sourceGoal => {
      // Find matching goal in target month if it exists
      const existingGoal = targetGoals.find(g => g.id === sourceGoal.id);
      
      // Get total progress up to source month
      const progressSoFar = goalProgress[sourceGoal.id] || 0;
      
      if (existingGoal) {
        // Important: We're bringing forward metadata and progress from source month,
        // but preserving any existing target month progress data
        return {
          ...sourceGoal,
          targetAmount: sourceGoal.targetAmount,  // Keep target amount from source
          targetDate: sourceGoal.targetDate,      // Keep target date from source
          description: sourceGoal.description,    // Keep description from source
          type: sourceGoal.type,                  // Keep goal type from source
          priority: sourceGoal.priority,          // Keep priority from source
          currentAmount: progressSoFar,           // Update cumulative progress
          monthlyProgress: {
            ...sourceGoal.monthlyProgress,        // Bring source monthly progress
            ...existingGoal.monthlyProgress       // But preserve target month's own progress (if any)
          }
        };
      } else {
        // Goal doesn't exist in target month, copy it with its progress
        return {
          ...sourceGoal,
          currentAmount: progressSoFar,
          // We're creating a new goal for the target month, so simply copy the monthly progress data
          monthlyProgress: { ...sourceGoal.monthlyProgress } 
          // Note: We're only copying the monthly progress entries, not adding a new one for the target month
        };
      }
    });
    
    // Update goals for target month
    setAllGoals(prev => ({
      ...prev,
      [targetMonthId]: updatedTargetGoals
    }));
    
    // Save to localStorage
    localStorage.setItem(`goals_${targetMonthId}`, JSON.stringify(updatedTargetGoals));
    
    // 2. Propagate Debts
    // Get source month debts
    const sourceDebts = allDebts[sourceMonthId] || [];
    // Get target month debts or initialize empty array
    const targetDebts = allDebts[targetMonthId] || [];
    
    // For each debt in source month, update or create in target month
    const updatedTargetDebts = sourceDebts.map(sourceDebt => {
      // Find matching debt in target month if it exists
      const existingDebt = targetDebts.find(d => d.id === sourceDebt.id);
      
      // Get the latest balance from source month - this will be our starting point
      let latestBalance = sourceDebt.balance;
      
      // If source month has a specific balance, use that instead
      if (sourceDebt.monthlyBalances && sourceDebt.monthlyBalances[sourceMonthId]) {
        latestBalance = sourceDebt.monthlyBalances[sourceMonthId];
      }
      
      // Calculate total payments made up to source month
      let totalPayments = 0;
      if (sourceDebt.monthlyPayments) {
        relevantMonthIds.forEach(monthId => {
          if (sourceDebt.monthlyPayments && sourceDebt.monthlyPayments[monthId]) {
            totalPayments += sourceDebt.monthlyPayments[monthId];
          }
        });
      }
      
      if (existingDebt) {
        // Preserve the target month's existing data while updating metadata from source
        return {
          ...sourceDebt,
          name: sourceDebt.name,                    // Keep name from source
          balance: latestBalance,                   // Update with latest balance
          dueDate: sourceDebt.dueDate,              // Keep due date from source
          interestRate: sourceDebt.interestRate,    // Keep interest rate from source
          minimumPayment: sourceDebt.minimumPayment,// Keep minimum payment from source
          priority: sourceDebt.priority,            // Keep priority from source
          monthlyPayments: {
            ...sourceDebt.monthlyPayments,          // Bring source payments
            ...existingDebt.monthlyPayments         // But preserve target month's own payments (if any)
          },
          monthlyBalances: {
            ...sourceDebt.monthlyBalances,          // Bring source balances
            ...existingDebt.monthlyBalances         // But preserve target month's own balances (if any)
          }
        };
      } else {
        // Debt doesn't exist in target month, copy it with current balance
        return {
          ...sourceDebt,
          balance: latestBalance,
          // We're creating a new debt for the target month, so copy the monthly payment/balance data
          monthlyPayments: { ...sourceDebt.monthlyPayments },
          monthlyBalances: { ...sourceDebt.monthlyBalances }
          // Note: We're only copying the entries, not adding new ones for target month
        };
      }
    });
    
    // Update debts for target month
    setAllDebts(prev => ({
      ...prev,
      [targetMonthId]: updatedTargetDebts
    }));
    
    // Save to localStorage
    localStorage.setItem(`debts_${targetMonthId}`, JSON.stringify(updatedTargetDebts));
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
        // User profile
        userProfile,
        updateUserProfile,
        
        // Month Selection
        months,
        activeMonth,
        setActiveMonth: setActiveMonthHandler,
        addMonth: addMonthHandler,
        
        // Income
        incomes,
        addIncome,
        updateIncome,
        deleteIncome,
        
        // Expenses
        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
        
        // Budgets
        budgets,
        setBudget,
        updateBudget,
        
        // Goals
        goals,
        addGoal,
        updateGoal,
        deleteGoal,
        
        // Debts
        debts,
        addDebt,
        updateDebt,
        deleteDebt,
        
        // Recommendations
        recommendations,
        markRecommendationAsRead,
        
        // Alerts
        alerts,
        markAlertAsRead,
        clearAllAlerts,
        
        // Scenarios
        scenarios,
        addScenario,
        updateScenario,
        deleteScenario,
        
        // Summary data
        totalIncome,
        totalExpenses,
        netCashflow,
        savingsRate,
        
        // Helper functions
        categorizeExpense,
        generateRecommendations,
        checkBudgetAlerts,
        compareWithPreviousMonth,
        
        // Month data propagation
        updateFutureMonths,
        
        // AI Goal Optimization features
        prioritizeGoalsWithAI,
        getGoalRecommendations,
        analyzeSpendingForGoals
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