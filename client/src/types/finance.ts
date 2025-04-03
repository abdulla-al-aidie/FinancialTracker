// Expense Categories as defined in requirements
export enum ExpenseCategory {
  Housing = "Housing",
  Transportation = "Transportation",
  Food = "Food",
  Healthcare = "Healthcare",
  Insurance = "Insurance & Personal Protection",
  Debt = "Debt & Loans",
  Personal = "Personal & Family",
  Entertainment = "Entertainment & Leisure",
  Gifts = "Gifts & Charity",
  Education = "Education & Professional Development",
  Miscellaneous = "Miscellaneous & Other"
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
  description: string;
}

// Expense Entry
export interface Expense {
  id: number;
  amount: number;
  date: string;
  category: ExpenseCategory;
  description: string;
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
}