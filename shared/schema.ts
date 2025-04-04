import { pgTable, text, serial, integer, boolean, varchar, numeric, date, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// User profiles table
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  currency: varchar("currency", { length: 10 }).default("USD"),
  notificationPreferences: jsonb("notification_preferences").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Months table to track available months
export const months = pgTable("months", {
  id: varchar("id", { length: 10 }).primaryKey(), // Format: YYYY-MM
  name: varchar("name", { length: 50 }).notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Incomes table
export const incomes = pgTable("incomes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  monthId: varchar("month_id", { length: 10 }).notNull().references(() => months.id),
  source: varchar("source", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date"),
  recurring: boolean("recurring").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Expenses table
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  monthId: varchar("month_id", { length: 10 }).notNull().references(() => months.id),
  description: varchar("description", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  date: date("date"),
  essential: boolean("essential").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Budgets table
export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  monthId: varchar("month_id", { length: 10 }).notNull().references(() => months.id),
  category: varchar("category", { length: 100 }).notNull(),
  limit: numeric("limit", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Goals table
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  monthId: varchar("month_id", { length: 10 }).notNull().references(() => months.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  targetAmount: numeric("target_amount", { precision: 10, scale: 2 }).notNull(),
  currentAmount: numeric("current_amount", { precision: 10, scale: 2 }).default("0"),
  targetDate: date("target_date"),
  type: varchar("type", { length: 50 }).notNull(), // e.g., 'savings', 'investment', 'education'
  priority: integer("priority").default(0),
  monthlyProgress: jsonb("monthly_progress").default({}), // Store monthly contributions as JSON
  createdAt: timestamp("created_at").defaultNow(),
});

// Debts table
export const debts = pgTable("debts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  monthId: varchar("month_id", { length: 10 }).notNull().references(() => months.id),
  name: varchar("name", { length: 255 }).notNull(),
  balance: numeric("balance", { precision: 10, scale: 2 }).notNull(),
  interestRate: numeric("interest_rate", { precision: 5, scale: 2 }),
  minimumPayment: numeric("minimum_payment", { precision: 10, scale: 2 }),
  priority: integer("priority").default(0),
  dueDate: date("due_date"),
  monthlyPayments: jsonb("monthly_payments").default({}), // Store monthly payments as JSON
  monthlyBalances: jsonb("monthly_balances").default({}), // Store monthly balances as JSON
  originalPrincipal: numeric("original_principal", { precision: 10, scale: 2 }).notNull(), // Original loan amount
  totalPaid: numeric("total_paid", { precision: 10, scale: 2 }).default(0), // Total amount paid across all months
  isPaidOff: boolean("is_paid_off").default(false), // Flag to indicate if debt is fully paid off
  createdAt: timestamp("created_at").defaultNow(),
});

// Recommendations table
export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  monthId: varchar("month_id", { length: 10 }).notNull().references(() => months.id),
  description: text("description").notNull(),
  impact: varchar("impact", { length: 50 }).notNull(), // e.g., 'high', 'medium', 'low'
  category: varchar("category", { length: 100 }).notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Alerts table
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  monthId: varchar("month_id", { length: 10 }).notNull().references(() => months.id),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // e.g., 'warning', 'info', 'success'
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Financial scenarios table
export const scenarios = pgTable("scenarios", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  incomeChanges: jsonb("income_changes").default({}),
  expenseChanges: jsonb("expense_changes").default({}),
  debtChanges: jsonb("debt_changes").default({}),
  goalChanges: jsonb("goal_changes").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// Create insert schemas for all tables
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles);
export const insertMonthSchema = createInsertSchema(months);
export const insertIncomeSchema = createInsertSchema(incomes);
export const insertExpenseSchema = createInsertSchema(expenses);
export const insertBudgetSchema = createInsertSchema(budgets);
export const insertGoalSchema = createInsertSchema(goals);
export const insertDebtSchema = createInsertSchema(debts);
export const insertRecommendationSchema = createInsertSchema(recommendations);
export const insertAlertSchema = createInsertSchema(alerts);
export const insertScenarioSchema = createInsertSchema(scenarios);

// Export all types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

export type Month = typeof months.$inferSelect;
export type InsertMonth = z.infer<typeof insertMonthSchema>;

export type Income = typeof incomes.$inferSelect;
export type InsertIncome = z.infer<typeof insertIncomeSchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;

export type Debt = typeof debts.$inferSelect;
export type InsertDebt = z.infer<typeof insertDebtSchema>;

export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type Scenario = typeof scenarios.$inferSelect;
export type InsertScenario = z.infer<typeof insertScenarioSchema>;
