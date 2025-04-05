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
import { getFromDb, listDbKeys, saveToDb, loadAllFinanceData } from "../utils/database";
import { formatCurrency } from "@/lib/calculations";

// Default user profile
const DEFAULT_USER_PROFILE: UserProfile = {
  name: "",
  email: "",
  preferredCurrency: "USD",
  goalPreference: GoalType.Other,
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
  addGoalContribution: (contribution: { goalId: number; amount: number; date: string; notes?: string }) => void;
  
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

// Helper function to save data to localStorage and update the auto-save timestamp
const saveToLocalStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem("lastAutoSaveTime", new Date().toISOString());
    
    // Also save to Replit DB automatically
    saveToDb(key, data).catch(err => {
      console.error(`Error auto-saving ${key} to database:`, err);
    });
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

// Helper function to load data from Replit DB or fallback to localStorage
const loadData = async (key: string): Promise<any> => {
  try {
    // First try to load from Replit DB
    const dbData = await getFromDb(key);
    if (dbData !== null) {
      // Also update localStorage with the DB data to keep them in sync
      localStorage.setItem(key, JSON.stringify(dbData));
      return dbData;
    }
    
    // If no data in DB, try localStorage
    const localData = localStorage.getItem(key);
    if (localData) {
      return JSON.parse(localData);
    }
    
    // If no data anywhere, return null
    return null;
  } catch (error) {
    console.error(`Error loading ${key} from database:`, error);
    
    // Fallback to localStorage on error
    try {
      const localData = localStorage.getItem(key);
      if (localData) {
        return JSON.parse(localData);
      }
    } catch (localError) {
      console.error(`Error fallback loading ${key} from localStorage:`, localError);
    }
    
    return null;
  }
};

// Provider component
export function FinanceProvider({ children }: { children: ReactNode }) {
  // State for all financial data
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  
  // Month data
  const [months, setMonths] = useState<MonthData[]>([]);
  const [activeMonth, setActiveMonth] = useState<string>(getCurrentMonthId());
  
  // All financial data is organized by month
  const [allIncomes, setAllIncomes] = useState<Record<string, Income[]>>({});
  const [allExpenses, setAllExpenses] = useState<Record<string, Expense[]>>({});
  const [allBudgets, setAllBudgets] = useState<Record<string, Budget[]>>({});
  const [allGoals, setAllGoals] = useState<Record<string, Goal[]>>({});
  const [allDebts, setAllDebts] = useState<Record<string, Debt[]>>({});
  
  // These are still shared across all months
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  
  // Loading state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
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
  
  // Load data from database or localStorage on initial render
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        console.log("Loading financial data from database...");
        
        // First try to load all data directly from the database
        try {
          const data = await loadAllFinanceData();
          
          if (data.months && data.months.length > 0) {
            console.log("Found data in database, loading directly...");
            
            // Set shared data
            if (Object.keys(data.userProfile).length > 0) {
              setUserProfile({
                ...DEFAULT_USER_PROFILE,
                ...data.userProfile,
                // Ensure nested objects always have their defaults
                emailNotifications: {
                  ...DEFAULT_USER_PROFILE.emailNotifications,
                  ...(data.userProfile.emailNotifications || {})
                },
                alertPreferences: {
                  ...DEFAULT_USER_PROFILE.alertPreferences,
                  ...(data.userProfile.alertPreferences || {})
                }
              });
            }
            
            setMonths(data.months);
            
            // Get current month
            const currentMonthId = getCurrentMonthId();
            
            // If current month is not in the data, add it
            if (!data.months.some((m: any) => m.id === currentMonthId)) {
              const newMonth: MonthData = {
                id: currentMonthId,
                name: getMonthName(currentMonthId),
                isActive: false
              };
              setMonths(prevMonths => [...prevMonths, newMonth]);
            }
            
            // Set active month
            if (data.months.some((m: any) => m.isActive)) {
              const activeMonth = data.months.find((m: any) => m.isActive);
              setActiveMonth(activeMonth.id);
            } else if (data.months.some((m: any) => m.id === currentMonthId)) {
              setActiveMonth(currentMonthId);
            } else {
              // Sort months and select latest
              const sortedMonths = [...data.months].sort((a, b) => b.id.localeCompare(a.id));
              setActiveMonth(sortedMonths[0].id);
            }
            
            // Set monthly data
            if (Object.keys(data.allIncomes).length > 0) setAllIncomes(data.allIncomes);
            if (Object.keys(data.allExpenses).length > 0) setAllExpenses(data.allExpenses);
            if (Object.keys(data.allBudgets).length > 0) setAllBudgets(data.allBudgets);
            if (Object.keys(data.allGoals).length > 0) setAllGoals(data.allGoals);
            if (Object.keys(data.allDebts).length > 0) setAllDebts(data.allDebts);
            
            // Set other shared data
            if (data.recommendations.length > 0) setRecommendations(data.recommendations);
            if (data.alerts.length > 0) setAlerts(data.alerts);
            if (data.scenarios.length > 0) setScenarios(data.scenarios);
            
            console.log("Financial data loaded successfully from database");
            setIsLoading(false);
            
            // Generate initial recommendations and alerts
            setTimeout(() => {
              generateInitialRecommendations();
              checkBudgetAlerts();
            }, 1000);
            
            return; // Exit early, no need to continue with the next block
          }
        } catch (dbError) {
          console.error("Error loading directly from database:", dbError);
        }
        
        // If we reach here, fallback to the original loading method
        console.log("Falling back to traditional loading method");
        
        // Load shared data from database or fallback to localStorage
        const userProfileData = await loadData("userProfile");
        const goalsData = await loadData("goals");
        const debtsData = await loadData("debts");
        const scenariosData = await loadData("scenarios");
        const monthsData = await loadData("months");
        
        // Active month is determined from months data or current month
        let currentActiveMonth = activeMonth;
        
        // Load shared data that persists across months with proper defaults
        if (userProfileData) {
          // Ensure all required fields exist with safe defaults
          const safeUserProfile: UserProfile = {
            ...DEFAULT_USER_PROFILE,
            ...userProfileData,
            // Ensure nested objects always have their defaults
            emailNotifications: {
              ...DEFAULT_USER_PROFILE.emailNotifications,
              ...(userProfileData.emailNotifications || {})
            },
            alertPreferences: {
              ...DEFAULT_USER_PROFILE.alertPreferences,
              ...(userProfileData.alertPreferences || {})
            }
          };
          setUserProfile(safeUserProfile);
          // Save the complete user profile back to ensure it has all fields
          saveToLocalStorage("userProfile", safeUserProfile);
        } else {
          // Initialize with defaults if no data
          setUserProfile(DEFAULT_USER_PROFILE);
          saveToLocalStorage("userProfile", DEFAULT_USER_PROFILE);
        }
        
        if (scenariosData) setScenarios(scenariosData);
        
        // Initialize goals and debts records
        const goalsRecord: Record<string, Goal[]> = {};
        const debtsRecord: Record<string, Debt[]> = {};
        
        // Initialize months - always ensure we have at least the current month
        const currentMonthId = getCurrentMonthId();
        let monthsArray: MonthData[] = [];
        
        // Process months data if available
        if (monthsData && Array.isArray(monthsData) && monthsData.length > 0) {
          monthsArray = monthsData;
          
          // Find active month
          const activeMonthData = monthsArray.find(m => m.isActive);
          if (activeMonthData) {
            currentActiveMonth = activeMonthData.id;
            setActiveMonth(activeMonthData.id);
          }
        } else {
          // Initialize with current month if no months data available
          const newMonth: MonthData = { 
            id: currentMonthId, 
            name: getMonthName(currentMonthId),
            isActive: true
          };
          monthsArray = [newMonth];
        }
        
        // Always set months and ensure it's saved
        setMonths(monthsArray);
        saveToLocalStorage("months", monthsArray);
        
        // Process goals data
        if (goalsData && Array.isArray(goalsData)) {
          // Ensure all goals have a priority
          const goalsWithPriority = goalsData.map((goal: Goal) => ({
            ...goal,
            priority: goal.priority !== undefined ? goal.priority : 5 // Set default priority if missing
          }));
          
          // Initialize goals for the current month
          goalsRecord[currentActiveMonth] = goalsWithPriority;
          setAllGoals(goalsRecord);
          
          // Save back to ensure all goals have priorities (backwards compatibility)
          saveToLocalStorage("goals", goalsWithPriority);
        } else {
          // Initialize with empty array if no goals data found
          goalsRecord[currentActiveMonth] = [];
          setAllGoals(goalsRecord);
          saveToLocalStorage("goals", []);
        }
        
        // Process debts data
        if (debtsData && Array.isArray(debtsData)) {
          // Initialize debts for the current month
          debtsRecord[currentActiveMonth] = debtsData;
          setAllDebts(debtsRecord);
          
          // Keep a copy in the old format for backward compatibility
          saveToLocalStorage("debts", debtsData);
        } else {
          // Initialize with empty array if no debts data found
          debtsRecord[currentActiveMonth] = [];
          setAllDebts(debtsRecord);
          saveToLocalStorage("debts", []);
        }
        
        // Load month-specific data for current active month
        const monthIncomes = await loadData(`incomes_${currentActiveMonth}`);
        const monthExpenses = await loadData(`expenses_${currentActiveMonth}`);
        const monthBudgets = await loadData(`budgets_${currentActiveMonth}`);
        const monthGoals = await loadData(`goals_${currentActiveMonth}`);
        const monthDebts = await loadData(`debts_${currentActiveMonth}`);
        
        // Initialize month data records
        const incomesRecord: Record<string, Income[]> = {};
        const expensesRecord: Record<string, Expense[]> = {};
        const budgetsRecord: Record<string, Budget[]> = {};
        
        // Add month-specific data to records
        if (monthIncomes && Array.isArray(monthIncomes)) {
          incomesRecord[currentActiveMonth] = monthIncomes;
        } else {
          incomesRecord[currentActiveMonth] = [];
        }
        
        if (monthExpenses && Array.isArray(monthExpenses)) {
          expensesRecord[currentActiveMonth] = monthExpenses;
        } else {
          expensesRecord[currentActiveMonth] = [];
        }
        
        if (monthBudgets && Array.isArray(monthBudgets)) {
          budgetsRecord[currentActiveMonth] = monthBudgets;
        } else {
          budgetsRecord[currentActiveMonth] = [];
        }
        
        // Override goals/debts if month-specific versions exist
        if (monthGoals && Array.isArray(monthGoals)) {
          goalsRecord[currentActiveMonth] = monthGoals;
        } else {
          goalsRecord[currentActiveMonth] = [];
        }
        
        if (monthDebts && Array.isArray(monthDebts)) {
          debtsRecord[currentActiveMonth] = monthDebts;
        } else {
          debtsRecord[currentActiveMonth] = [];
        }
        
        // Set state with loaded data
        setAllIncomes(incomesRecord);
        setAllExpenses(expensesRecord);
        setAllBudgets(budgetsRecord);
        
        // Ensure goals and debts are set
        if (Object.keys(goalsRecord).length > 0) {
          setAllGoals(goalsRecord);
        }
        
        if (Object.keys(debtsRecord).length > 0) {
          setAllDebts(debtsRecord);
        }
        
        // Generate initial recommendations and alerts
        setTimeout(() => {
          generateInitialRecommendations();
          checkBudgetAlerts();
        }, 1000);
      } catch (error) {
        console.error("Error loading initial data:", error);
        
        // Still try to generate initial recommendations if data exists
        setTimeout(() => {
          generateInitialRecommendations();
          checkBudgetAlerts();
        }, 1000);
      }
    };
    
    loadInitialData();
  }, []);
  
  // Recalculate summary data when income or expenses change
  useEffect(() => {
    calculateSummaryData();
  }, [incomes, expenses]);
  
  // Save data to localStorage whenever it changes
  useEffect(() => {
    // Save months and active month
    saveToLocalStorage("months", months);
    saveToLocalStorage("activeMonth", activeMonth);
    
    // Save all other shared data
    saveToLocalStorage("userProfile", userProfile);
    saveToLocalStorage("recommendations", recommendations);
    saveToLocalStorage("alerts", alerts);
    saveToLocalStorage("scenarios", scenarios);
    
    // No need to save summary calculations as they're derived
  }, [months, activeMonth, userProfile, recommendations, alerts, scenarios]);
  
  // Save month-specific data whenever it changes
  useEffect(() => {
    // Save only if we have data for the active month
    if (incomes.length > 0) {
      saveToLocalStorage(`incomes_${activeMonth}`, incomes);
    }
  }, [incomes, activeMonth]);
  
  useEffect(() => {
    if (expenses.length > 0) {
      saveToLocalStorage(`expenses_${activeMonth}`, expenses);
    }
  }, [expenses, activeMonth]);
  
  useEffect(() => {
    if (budgets.length > 0) {
      saveToLocalStorage(`budgets_${activeMonth}`, budgets);
    }
  }, [budgets, activeMonth]);
  
  useEffect(() => {
    if (goals.length > 0) {
      saveToLocalStorage(`goals_${activeMonth}`, goals);
      // Update legacy format for backward compatibility
      saveToLocalStorage("goals", goals);
    }
  }, [goals, activeMonth]);
  
  useEffect(() => {
    if (debts.length > 0) {
      saveToLocalStorage(`debts_${activeMonth}`, debts);
      // Update legacy format for backward compatibility
      saveToLocalStorage("debts", debts);
    }
  }, [debts, activeMonth]);
  
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
    saveToLocalStorage(`incomes_${activeMonth}`, updatedIncomes);
    
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
    saveToLocalStorage(`incomes_${activeMonth}`, updatedIncomes);
    
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
    saveToLocalStorage(`incomes_${activeMonth}`, updatedIncomes);
    
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
    saveToLocalStorage(`expenses_${activeMonth}`, updatedExpenses);
    
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
    saveToLocalStorage(`expenses_${activeMonth}`, updatedExpenses);
    
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
    saveToLocalStorage(`expenses_${activeMonth}`, updatedExpenses);
    
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
      saveToLocalStorage(`budgets_${activeMonth}`, updatedBudgets);
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
      saveToLocalStorage(`budgets_${activeMonth}`, updatedBudgets);
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
    saveToLocalStorage(`budgets_${activeMonth}`, updatedBudgets);
    
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
    saveToLocalStorage(`budgets_${activeMonth}`, updatedBudgets);
  };
  
  // Goal management
  const addGoal = (goal: Omit<Goal, "id" | "currentAmount">) => {
    // Calculate the current amount based on the monthly progress if provided
    // This ensures that existing payments for debt goals are properly counted
    const monthlyProgress = goal.monthlyProgress || {};
    const calculatedCurrentAmount = Object.values(monthlyProgress).reduce(
      (sum, amount) => sum + amount, 0
    );
    
    const newGoal: Goal = { 
      ...goal, 
      id: Date.now(),
      currentAmount: calculatedCurrentAmount, // Set initial currentAmount based on progress
      monthlyProgress: monthlyProgress, // Keep any existing monthly progress
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
    saveToLocalStorage(`goals_${activeMonth}`, updatedGoals);
    saveToLocalStorage("goals", updatedGoals); // For backwards compatibility
    
    // Automatically propagate changes to all future months in sequence
    propagateChangesToNextMonth();
    
    // Show special message for debt goals with existing progress
    if (goal.type === GoalType.DebtPayoff && calculatedCurrentAmount > 0) {
      toast({
        title: "Debt Goal Created",
        description: `Your goal "${goal.name}" was created with ${formatCurrency(calculatedCurrentAmount)} in existing payments`,
        variant: "default"
      });
    } else {
      toast({
        title: "Goal Created",
        description: `Your ${goal.type} goal "${goal.name}" has been created`,
        variant: "default"
      });
    }
  };
  
  // Add contribution to a goal
  const addGoalContribution = (contribution: { goalId: number, amount: number, date: string, notes?: string }) => {
    // Find the goal to update
    const goalToUpdate = goals.find(g => g.id === contribution.goalId);
    
    if (!goalToUpdate) {
      toast({
        title: "Error",
        description: "Goal not found",
        variant: "destructive"
      });
      return;
    }
    
    // Extract the YYYY-MM from the contribution date to determine which month
    // This allows contributions to be added to the correct month even if it's not the active month
    const dateParts = contribution.date.split('-');
    const contributionMonthId = dateParts.length >= 2 ? `${dateParts[0]}-${dateParts[1]}` : activeMonth;
    
    // Create a copy of the goal's monthly progress
    const updatedMonthlyProgress = { 
      ...goalToUpdate.monthlyProgress 
    };
    
    // Add or update the contribution for the appropriate month
    const currentContribution = updatedMonthlyProgress[contributionMonthId] || 0;
    updatedMonthlyProgress[contributionMonthId] = currentContribution + contribution.amount;
    
    // Calculate new current amount (sum of all monthly contributions)
    // This ensures that we're counting ALL historical contributions
    let newCurrentAmount = 0;
    Object.entries(updatedMonthlyProgress).forEach(([_, amount]) => {
      newCurrentAmount += amount as number;
    });
    
    // Check if goal is now completed
    const isCompleted = newCurrentAmount >= goalToUpdate.targetAmount;
    
    // Create updated goal
    const updatedGoal: Goal = {
      ...goalToUpdate,
      currentAmount: newCurrentAmount,
      monthlyProgress: updatedMonthlyProgress,
      // Set completed status
      completed: isCompleted
    };
    
    // Create a corresponding expense entry for this contribution
    const expenseData = {
      id: Date.now(),
      amount: contribution.amount,
      date: contribution.date,
      category: ExpenseCategory.Savings,
      description: `Contribution to ${goalToUpdate.name}${contribution.notes ? `: ${contribution.notes}` : ''}`,
    };
    
    // Add the expense to track this savings contribution
    addExpense(expenseData);
    
    // Update goals array
    const updatedGoals = goals.map(g => g.id === contribution.goalId ? updatedGoal : g);
    
    // Update the allGoals state with updated goals for the current month
    setAllGoals({
      ...allGoals,
      [activeMonth]: updatedGoals
    });
    
    // Save to localStorage
    saveToLocalStorage(`goals_${activeMonth}`, updatedGoals);
    saveToLocalStorage("goals", updatedGoals); // For backwards compatibility
    
    // Automatically propagate changes to all future months in sequence
    propagateChangesToNextMonth();
    
    // Format the amount for the toast
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(contribution.amount);
    
    toast({
      title: "Contribution Added",
      description: `Added ${formattedAmount} to "${goalToUpdate.name}"`,
      variant: "default"
    });
    
    // Show completion notification if goal is now completed
    if (isCompleted) {
      toast({
        title: "Goal Completed! 🎉",
        description: `Congratulations! You've reached your goal: "${goalToUpdate.name}"`,
        variant: "default"
      });
    }
  };
  
  const updateGoal = (goal: Goal) => {
    const updatedGoals = goals.map(g => g.id === goal.id ? goal : g);
    
    // Update the allGoals state with updated goals for the current month
    setAllGoals({
      ...allGoals,
      [activeMonth]: updatedGoals
    });
    
    // Save to localStorage (both month-specific and for backward compatibility)
    saveToLocalStorage(`goals_${activeMonth}`, updatedGoals);
    saveToLocalStorage("goals", updatedGoals); // For backwards compatibility
    
    // Automatically propagate changes to the next month if it exists
    propagateChangesToNextMonth();
    
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
    saveToLocalStorage(`goals_${activeMonth}`, updatedGoals);
    saveToLocalStorage("goals", updatedGoals); // For backwards compatibility
    
    // Automatically propagate changes to the next month if it exists
    propagateChangesToNextMonth();
    
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
    saveToLocalStorage(`debts_${activeMonth}`, updatedDebts);
    saveToLocalStorage("debts", updatedDebts); // For backwards compatibility
    
    // Automatically propagate changes to the next month if it exists
    propagateChangesToNextMonth();
    
    toast({
      title: "Debt Added",
      description: `Your debt "${debt.name}" has been added`,
      variant: "default"
    });
  };
  
  const updateDebt = (debt: Debt) => {
    // Get the existing debt to compare changes
    const existingDebt = debts.find(d => d.id === debt.id);
    
    if (!existingDebt) {
      console.error("Cannot update debt: debt not found");
      return;
    }
    
    // Ensure monthly payments object exists
    if (!debt.monthlyPayments) {
      debt.monthlyPayments = {};
    }
    
    // Ensure monthly balances object exists
    if (!debt.monthlyBalances) {
      debt.monthlyBalances = {};
    }
    
    // Calculate the total payments made across all months
    const allPayments = debt.monthlyPayments || {};
    const totalPaid = Object.values(allPayments).reduce(
      (sum, amount) => sum + amount, 0
    );
    
    // Update the totalPaid field for tracking
    debt.totalPaid = totalPaid;
    
    // Don't update the main balance field directly anymore
    // Leave it as the original remaining balance when the debt was first created
    // This will be used as a fallback for months with no specific balance
    
    // Only update the current month's debt in the monthly records
    const updatedDebts = debts.map(d => {
      if (d.id === debt.id) {
        return {
          ...existingDebt,               // Start with existing debt data
          name: debt.name,               // Update basic information
          originalPrincipal: debt.originalPrincipal,
          interestRate: debt.interestRate,
          minimumPayment: debt.minimumPayment,
          dueDate: debt.dueDate,
          priority: debt.priority,       // Keep priority setting
          totalPaid: totalPaid,          // Update with calculated total
          monthlyPayments: debt.monthlyPayments,  // Update payment records
          monthlyBalances: debt.monthlyBalances   // Update balance records
        };
      }
      return d;
    });
    
    // Update the allDebts state with updated debts for the current month only
    setAllDebts(prev => ({
      ...prev,
      [activeMonth]: updatedDebts
    }));
    
    // Save to localStorage (both month-specific and for backward compatibility)
    saveToLocalStorage(`debts_${activeMonth}`, updatedDebts);
    
    // For backward compatibility, but don't override the month structure
    saveToLocalStorage("debts", updatedDebts);
    
    // Automatically propagate changes to the next month if it exists
    propagateChangesToNextMonth();
    
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
    saveToLocalStorage(`debts_${activeMonth}`, updatedDebts);
    saveToLocalStorage("debts", updatedDebts); // For backwards compatibility
    
    // Automatically propagate changes to the next month if it exists
    propagateChangesToNextMonth();
    
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
    saveToLocalStorage("scenarios", updatedScenarios);
    
    toast({
      title: "Scenario Created",
      description: `Your what-if scenario "${scenario.name}" has been created`,
      variant: "default"
    });
  };
  
  const updateScenario = (scenario: Scenario) => {
    const updatedScenarios = scenarios.map(s => s.id === scenario.id ? scenario : s);
    setScenarios(updatedScenarios);
    saveToLocalStorage("scenarios", updatedScenarios);
    
    toast({
      title: "Scenario Updated",
      description: `Your scenario "${scenario.name}" has been updated`,
      variant: "default"
    });
  };
  
  const deleteScenario = (id: number) => {
    const updatedScenarios = scenarios.filter(s => s.id !== id);
    setScenarios(updatedScenarios);
    saveToLocalStorage("scenarios", updatedScenarios);
    
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
    saveToLocalStorage("months", updatedMonths);
    
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
    saveToLocalStorage("months", updatedMonths);
    
    // Find a previous month to copy data from
    const sortedMonths = [...months.map(m => m.id)].sort();
    if (sortedMonths.length > 0) {
      // Get the most recent month that comes before this new month
      const previousMonths = sortedMonths.filter(m => m < monthId);
      const mostRecentMonth = previousMonths.length > 0 ? previousMonths[previousMonths.length - 1] : null;
      
      if (mostRecentMonth) {
        // Use propagateMonthData to copy all relevant data from the previous month
        // This ensures we're always using the most recent month's data
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
          saveToLocalStorage(`budgets_${monthId}`, newBudgets);
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
      saveToLocalStorage(`goals_${activeMonth}`, updatedGoals);
      saveToLocalStorage("goals", updatedGoals); // For backwards compatibility

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
        saveToLocalStorage(`goals_${activeMonth}`, updatedGoals);
        saveToLocalStorage("goals", updatedGoals); // For backwards compatibility
        
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
  // Including historical data from previous months for better insights
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
      
      // Get previous months data for historical comparison
      const sortedMonthIds = [...months]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(month => month.id);
      
      // Get current month's index to find previous months
      const activeMonthIndex = sortedMonthIds.indexOf(activeMonth);
      
      // Collect expenses from up to 3 previous months if available
      const historicalExpenses: {
        monthId: string;
        expenses: Array<{
          category: string;
          amount: number;
          date: string;
          description?: string;
        }>;
      }[] = [];
      
      // Loop through up to 3 previous months
      for (let i = 1; i <= 3; i++) {
        const prevMonthIndex = activeMonthIndex - i;
        if (prevMonthIndex >= 0) {
          const prevMonthId = sortedMonthIds[prevMonthIndex];
          const prevMonthExpenses = allExpenses[prevMonthId] || [];
          
          if (prevMonthExpenses.length > 0) {
            historicalExpenses.push({
              monthId: prevMonthId,
              expenses: prevMonthExpenses.map(exp => ({
                category: exp.category,
                amount: exp.amount,
                date: exp.date,
                description: exp.description
              }))
            });
          }
        }
      }
      
      const analysisResult = await analyzeSpendingPatterns({
        expenses: expenses.map(exp => ({
          category: exp.category,
          amount: exp.amount,
          date: exp.date,
          description: exp.description
        })),
        historicalExpenses,
        income: totalIncome,
        targetSavingsRate,
        currentMonth: activeMonth
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
  
  // Function to propagate data to all months in sequence for the entire year cycle
  const updateFutureMonths = async () => {
    // Get all months sorted chronologically
    const sortedMonths = [...months.map(m => m.id)].sort();
    
    if (sortedMonths.length <= 1) {
      toast({
        title: "Not Enough Months",
        description: "You need at least two months to propagate data. Add more months first.",
        variant: "default"
      });
      return;
    }
    
    // Extract month parts to organize by month number regardless of year
    const monthsByMonthNumber = sortedMonths.map(monthId => {
      const [year, month] = monthId.split('-');
      return { 
        monthId,
        year: parseInt(year),
        month: parseInt(month)
      };
    }).sort((a, b) => a.month - b.month); // Sort by month number (January first, December last)
    
    // Propagate goals and debts in month-to-month sequence through the entire year
    toast({
      title: "Updating All Months",
      description: "Propagating debt and goal data through all months sequentially...",
      variant: "default"
    });
    
    // First, identify all the month pairs for propagation
    const monthPairs = [];
    
    // Handle all the standard month-to-month propagations (Jan→Feb, Feb→Mar, etc.)
    for (let i = 0; i < monthsByMonthNumber.length - 1; i++) {
      const current = monthsByMonthNumber[i];
      const next = monthsByMonthNumber[i + 1];
      monthPairs.push({ source: current.monthId, target: next.monthId });
    }
    
    // Handle December to January transition (if they exist)
    const december = monthsByMonthNumber.find(m => m.month === 12);
    const january = monthsByMonthNumber.find(m => m.month === 1);
    
    if (december && january) {
      monthPairs.push({ source: december.monthId, target: january.monthId });
    }
    
    // Now propagate data for each pair in sequence
    for (let pair of monthPairs) {
      propagateMonthData(pair.source, pair.target);
    }
    
    toast({
      title: "All Months Updated",
      description: "Debt and goal data has been propagated through all months in sequence, including from December to January.",
      variant: "default"
    });
  };
  
  // Helper function to propagate changes to the next month and all subsequent months
  const propagateChangesToNextMonth = () => {
    // Get all months sorted chronologically
    const sortedMonths = [...months.map(m => m.id)].sort();
    const activeMonthIndex = sortedMonths.indexOf(activeMonth);
    
    // Check if there is a next month
    if (activeMonthIndex >= 0 && activeMonthIndex < sortedMonths.length - 1) {
      // Start with the active month and propagate sequentially to all future months
      for (let i = activeMonthIndex; i < sortedMonths.length - 1; i++) {
        const currentMonth = sortedMonths[i];
        const nextMonth = sortedMonths[i + 1];
        
        // Propagate data from current month to next month
        propagateMonthData(currentMonth, nextMonth);
      }
      
      toast({
        title: "All Future Months Updated",
        description: "Your changes have been propagated to all future months in sequence",
        variant: "default"
      });
    }
  };
  
  // Helper function to propagate data from one month to another
  const propagateMonthData = (sourceMonthId: string, targetMonthId: string) => {
    if (!sourceMonthId || !targetMonthId) {
      return;
    }
    
    // Special handling for December to January transition (year rollover)
    const isYearRollover = sourceMonthId.endsWith('-12') && targetMonthId.endsWith('-01');
    
    // For year rollovers, we allow propagation, otherwise enforce chronological order
    if (!isYearRollover && sourceMonthId >= targetMonthId) {
      // Don't propagate to the past or the same month unless it's December to January
      return;
    }
    
    // Get sorted list of all months to calculate proper progression
    const allMonthIds = Object.keys(months.reduce((acc, month) => {
      acc[month.id] = true;
      return acc;
    }, {} as Record<string, boolean>)).sort();
    
    // Only consider months up to and including the source month for calculations
    const relevantMonthIds = allMonthIds.filter(monthId => monthId <= sourceMonthId);
    
    // 1. Propagate Goals
    // Get source month goals
    const sourceGoals = allGoals[sourceMonthId] || [];
    // Get target month goals or initialize empty array
    const targetGoals = allGoals[targetMonthId] || [];
    
    // For each goal in source month, update or create in target month
    const updatedTargetGoals = sourceGoals.map(sourceGoal => {
      // Find matching goal in target month if it exists
      const existingGoal = targetGoals.find(g => g.id === sourceGoal.id);
      
      // Calculate cumulative progress for this goal up to source month (inclusive)
      let totalProgress = 0;
      
      // Sum up progress from ALL months, not just relevant ones
      // This ensures all progress is carried forward correctly
      if (sourceGoal.monthlyProgress) {
        Object.keys(sourceGoal.monthlyProgress).forEach(monthId => {
          totalProgress += sourceGoal.monthlyProgress[monthId] || 0;
        });
      }
      
      // Check if goal is complete based on the cumulative progress
      const isCompleted = totalProgress >= sourceGoal.targetAmount;
      
      if (existingGoal) {
        // If the goal exists in the target month, preserve its own monthly progress
        // but update the other properties from the source month
        const existingMonthlyProgress = existingGoal.monthlyProgress || {};
        
        // Combine the monthly progress, prioritizing the target month's existing progress values
        const combinedMonthlyProgress = {
          ...sourceGoal.monthlyProgress || {}, // First bring in source data
          ...existingMonthlyProgress           // But preserve target month's own progress (if any)
        };
        
        // Recalculate total progress including any progress in the target month
        let updatedTotalProgress = totalProgress;
        if (existingMonthlyProgress[targetMonthId]) {
          // If there's already progress in the target month, add it 
          // (replacing whatever might have been in the source data)
          updatedTotalProgress = totalProgress + existingMonthlyProgress[targetMonthId] - 
            (sourceGoal.monthlyProgress && sourceGoal.monthlyProgress[targetMonthId] || 0);
        }
        
        // Cap at target amount if completed
        updatedTotalProgress = Math.min(updatedTotalProgress, sourceGoal.targetAmount);
        
        // Check if goal is now complete with the updated progress
        const updatedIsCompleted = updatedTotalProgress >= sourceGoal.targetAmount;
        
        return {
          ...sourceGoal,
          targetAmount: sourceGoal.targetAmount,    // Keep target amount from source
          targetDate: sourceGoal.targetDate,        // Keep target date from source
          description: sourceGoal.description,      // Keep description from source
          type: sourceGoal.type,                    // Keep goal type from source
          priority: sourceGoal.priority,            // Keep priority from source
          currentAmount: updatedTotalProgress,      // Update with recalculated progress
          completed: updatedIsCompleted,            // Update completion status
          monthlyProgress: combinedMonthlyProgress  // Use combined monthly progress data
        };
      } else {
        // Goal doesn't exist in target month, create it with cumulative progress up to source month
        return {
          ...sourceGoal,
          currentAmount: isCompleted ? sourceGoal.targetAmount : totalProgress, // Cap at target amount if completed
          completed: isCompleted,                  // Mark as complete if target reached
          monthlyProgress: { ...sourceGoal.monthlyProgress }  // Copy monthly progress data
        };
      }
    });
    
    // Update goals for target month
    setAllGoals(prev => ({
      ...prev,
      [targetMonthId]: updatedTargetGoals
    }));
    
    // Save to localStorage
    saveToLocalStorage(`goals_${targetMonthId}`, updatedTargetGoals);
    
    // 2. Propagate Debts
    // Get source month debts
    const sourceDebts = allDebts[sourceMonthId] || [];
    // Get target month debts or initialize empty array
    const targetDebts = allDebts[targetMonthId] || [];
    
    // For each debt in source month, update or create in target month
    const updatedTargetDebts = sourceDebts.map(sourceDebt => {
      // Find matching debt in target month if it exists
      const existingDebt = targetDebts.find(d => d.id === sourceDebt.id);
      
      // Get the original principal amount
      const originalPrincipal = sourceDebt.originalPrincipal || 0;
      
      // Get all payment records (or initialize empty)
      const sourceMonthlyPayments = sourceDebt.monthlyPayments || {};
      
      // This is a critical fix for the payment propagation issue
      // We need to calculate the total of ALL historical payments
      let totalHistoricalPayments = 0;
      
      // First, sum ALL payments from the source debt (which should include all history)
      Object.entries(sourceMonthlyPayments).forEach(([monthId, amount]) => {
        // Include ALL payment history, regardless of month
        totalHistoricalPayments += amount as number;
      });
      
      // Calculate latest balance using original principal minus total payments
      // This is the key calculation that must be correct
      let latestBalance = Math.max(0, originalPrincipal - totalHistoricalPayments);
      
      // For fully paid debts, ensure balance is zero
      const isFullyPaid = latestBalance <= 0;
      if (isFullyPaid) {
        latestBalance = 0;
      }
      
      // Create monthly balance records, preserving history
      const updatedMonthlyBalances = {
        ...(sourceDebt.monthlyBalances || {}),
        // Always set the balance for the target month based on all historical payments
        [targetMonthId]: latestBalance
      };
      
      // Initialize totalPayments with the historical sum from source
      let totalPayments = totalHistoricalPayments;
      
      if (existingDebt) {
        // If debt exists in target month, get its payment data
        const existingMonthlyPayments = existingDebt.monthlyPayments || {};
        
        // CRITICAL FIX: Create a comprehensive payment history that preserves ALL monthly payment records
        // First, collect ALL payment records from both source and target months
        const completePaymentHistory: Record<string, number> = { };
        
        // Start by adding ALL source month payments (this includes historical data)
        Object.entries(sourceMonthlyPayments).forEach(([month, amount]) => {
          if (typeof amount === 'number') {
            completePaymentHistory[month] = amount;
          }
        });
        
        // Then add ALL target month payments, which will override source if there's a conflict
        // This ensures we don't lose any payments made directly in the target month
        Object.entries(existingMonthlyPayments).forEach(([month, amount]) => {
          if (typeof amount !== 'number') return;
          
          // For the target month ID specifically, we want to keep any existing payment
          // as it represents a payment made directly in that month
          if (month === targetMonthId) {
            completePaymentHistory[month] = amount;
            
            // Add this payment to our total if it's not already counted
            // (only add it if it wasn't in the source history)
            if (!sourceMonthlyPayments[month]) {
              totalPayments += amount;
            }
          } else {
            // For other months in the target's history, only keep them if 
            // they aren't already in the source (to avoid double-counting)
            if (!sourceMonthlyPayments[month]) {
              completePaymentHistory[month] = amount;
              totalPayments += amount;
            }
          }
        });
        
        // Recalculate balance with all payments included
        latestBalance = Math.max(0, originalPrincipal - totalPayments);
        if (latestBalance <= 0) {
          latestBalance = 0;
        }
        
        // Update the balance for target month
        updatedMonthlyBalances[targetMonthId] = latestBalance;
        
        return {
          ...sourceDebt,
          // Always ensure these key properties are set correctly
          name: sourceDebt.name,
          originalPrincipal: originalPrincipal,
          dueDate: sourceDebt.dueDate,
          interestRate: sourceDebt.interestRate,
          minimumPayment: sourceDebt.minimumPayment,
          priority: sourceDebt.priority,
          // CRITICAL: Set the main balance field for the target month
          balance: latestBalance,
          // CRITICAL: Use complete payment history with all months preserved
          monthlyPayments: completePaymentHistory,
          monthlyBalances: updatedMonthlyBalances,
          // Update total paid with ALL payments
          totalPaid: totalPayments,
          // Update paid off status
          isPaidOff: latestBalance <= 0
        };
      } else {
        // Debt doesn't exist in target month, create it with complete source data
        return {
          ...sourceDebt,
          // CRITICAL: Set the main balance field for proper display
          balance: latestBalance,
          // IMPORTANT: Keep ALL payment history intact - create properly typed payment history
          monthlyPayments: Object.entries(sourceMonthlyPayments).reduce((acc: Record<string, number>, [month, amount]) => {
            if (typeof amount === 'number') {
              acc[month] = amount;
            }
            return acc;
          }, {}),
          // Set balance for this month
          monthlyBalances: updatedMonthlyBalances,
          // Set total paid amount with ALL historical payments
          totalPaid: totalHistoricalPayments,
          // Mark as paid off if fully paid
          isPaidOff: isFullyPaid
        };
      }
    });
    
    // Update debts for target month
    setAllDebts(prev => ({
      ...prev,
      [targetMonthId]: updatedTargetDebts
    }));
    
    // Save to localStorage
    saveToLocalStorage(`debts_${targetMonthId}`, updatedTargetDebts);
  };
  
  // User profile management
  const updateUserProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    saveToLocalStorage("userProfile", profile);
    
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
        addGoalContribution,
        
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
// Need to use const for compatibility with React Fast Refresh
export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error("useFinance must be used within a FinanceProvider");
  }
  return context;
}