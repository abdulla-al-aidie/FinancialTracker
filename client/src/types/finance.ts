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
  Miscellaneous = "Miscellaneous or Emergency Fund"
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
}

// Budget for categories
export interface Budget {
  category: ExpenseCategory;
  limit: number;
  spent: number;
}

// Financial Goal Types
export enum GoalType {
  Saving = "Saving",
  DebtPayoff = "DebtPayoff"
}

// Financial Goal
export interface Goal {
  id: number;
  type: GoalType;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  description: string;
}

// Debt Tracking
export interface Debt {
  id: number;
  name: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
  dueDate: string;
  priority?: number; // Higher number means higher priority
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