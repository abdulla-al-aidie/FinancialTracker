// Expense Categories as defined in requirements
export enum ExpenseCategory {
  RentOrMortgage = "Rent or Mortgage",
  Utilities = "Utilities",
  InternetAndPhone = "Internet and Phone Bill",
  Insurance = "Insurance",
  Groceries = "Groceries",
  Transportation = "Transportation",
  DebtPayments = "Debt Payments",
  SubscriptionsAndMemberships = "Subscriptions and Memberships",
  ChildcareOrTuition = "Childcare or Tuition",
  MedicalAndHealth = "Medical and Health Expenses",
  PersonalCareAndClothing = "Personal Care and Clothing",
  SavingsAndInvestments = "Savings and Investments",
  EntertainmentAndDining = "Entertainment and Dining Out",
  PetExpenses = "Pet Expenses",
  Miscellaneous = "Miscellaneous or Emergency Fund",
  Savings = "Savings"
}

// Income Types
export enum IncomeType {
  Salary = "Salary",
  Freelance = "Freelance",
  Investment = "Investment",
  Gift = "Gift",
  Other = "Other"
}

// Income Entry
export interface Income {
  id: number;
  amount: number;
  date: string;
  type: IncomeType;
  description?: string;
}

// Expense Entry
export interface Expense {
  id: number;
  amount: number;
  date: string;
  category: ExpenseCategory;
  description?: string;
  associatedDebtId?: number; // Link to a debt when this expense is a debt payment
}

// Budget for categories
export interface Budget {
  category: ExpenseCategory;
  limit: number;
  spent: number;
}

// Financial Goal Types
export enum GoalType {
  Other = "Other",
  DebtPayoff = "DebtPayoff",
  EmergencyFund = "EmergencyFund",
  Retirement = "Retirement",
  Education = "Education",
  HomeDownPayment = "HomeDownPayment",
  Travel = "Travel",
  MajorPurchase = "MajorPurchase"
}

// Financial Goal
export interface Goal {
  id: number;
  type: GoalType;
  name: string;
  targetAmount: number;
  currentAmount: number; // Current overall progress (sum of monthlyProgress)
  monthlyProgress: Record<string, number>; // Progress by month ID (YYYY-MM)
  targetDate: string;
  description: string;
  priority: number; // 1-10 priority ranking, 10 being highest
  associatedDebtId?: number; // For DebtPayoff goals, links to the debt being paid off
  aiRecommendations?: GoalRecommendation[]; // AI-generated recommendations for achieving this goal
  completed?: boolean; // Whether the goal has been completed (current amount >= target amount)
}

// AI-Generated Goal Recommendation
export interface GoalRecommendation {
  id: number;
  description: string;
  potentialImpact: string; // e.g., "High", "Medium", "Low" 
  estimatedTimeReduction: string; // e.g., "2 months faster"
  requiredActions: string[];
  appliedDate?: string; // When the user applied this recommendation
}

// Debt Tracking
export interface Debt {
  id: number;
  name: string;
  balance: number;
  originalPrincipal: number; // Original amount of the debt for progress tracking
  totalPaid: number; // Total amount paid so far
  interestRate: number;
  minimumPayment: number;
  dueDate: string;
  priority?: number; // Higher number means higher priority
  monthlyPayments: Record<string, number>; // Monthly payments by month ID (YYYY-MM)
  monthlyBalances: Record<string, number>; // Balance at the end of each month by month ID (YYYY-MM)
  isPaidOff?: boolean; // Indicates if the debt has been fully paid off
}

// AI Recommendation
export interface Recommendation {
  id: number;
  type: string;
  description: string;
  impact: string;
  dateGenerated: string;
  isRead: boolean;
}

// Alert/Notification
export interface Alert {
  id: number;
  type: string;
  message: string;
  date: string;
  isRead: boolean;
}

// What-if Scenario
export interface Scenario {
  id: number;
  name: string;
  changes: {
    category: ExpenseCategory;
    adjustment: number;
  }[];
  projectedSavings: number;
  projectedTimeframe: string;
}

// User Profile
export interface UserProfile {
  name: string;
  email: string;
  preferredCurrency: string;
  goalPreference: GoalType;
  notificationsEnabled: boolean;
  emailNotifications: {
    budgetAlerts: boolean;
    paymentReminders: boolean;
    goalProgress: boolean;
    monthlyReports: boolean;
  };
  alertPreferences: {
    budgetWarningThreshold: number; // Percentage (e.g., 80 means alert at 80% of budget)
    lowBalanceThreshold: number; // Dollar amount
    upcomingPaymentDays: number; // Days before due date to notify
    instantAlerts: boolean; // Whether to show alerts immediately
  };
}

// Month data for tracking finances by month
export interface MonthData {
  id: string; // Format: YYYY-MM (e.g., "2023-04" for April 2023)
  name: string; // Display name (e.g., "April 2023")
  isActive: boolean;
}