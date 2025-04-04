import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { 
  users, type User, type InsertUser,
  userProfiles, type UserProfile, type InsertUserProfile,
  months, type Month, type InsertMonth,
  incomes, type Income, type InsertIncome,
  expenses, type Expense, type InsertExpense,
  budgets, type Budget, type InsertBudget,
  goals, type Goal, type InsertGoal,
  debts, type Debt, type InsertDebt,
  recommendations, type Recommendation, type InsertRecommendation,
  alerts, type Alert, type InsertAlert,
  scenarios, type Scenario, type InsertScenario
} from "@shared/schema";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // User profile management
  getUserProfile(userId: number): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: number, profile: Partial<InsertUserProfile>): Promise<UserProfile>;
  
  // Month management
  getMonths(userId: number): Promise<Month[]>;
  getMonth(userId: number, monthId: string): Promise<Month | undefined>;
  createMonth(month: InsertMonth): Promise<Month>;
  setActiveMonth(userId: number, monthId: string): Promise<void>;
  
  // Income management
  getIncomes(userId: number, monthId: string): Promise<Income[]>;
  getIncome(id: number): Promise<Income | undefined>;
  createIncome(income: InsertIncome): Promise<Income>;
  updateIncome(id: number, income: Partial<InsertIncome>): Promise<Income>;
  deleteIncome(id: number): Promise<void>;
  
  // Expense management
  getExpenses(userId: number, monthId: string): Promise<Expense[]>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense>;
  deleteExpense(id: number): Promise<void>;
  
  // Budget management
  getBudgets(userId: number, monthId: string): Promise<Budget[]>;
  getBudget(id: number): Promise<Budget | undefined>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudget(id: number, budget: Partial<InsertBudget>): Promise<Budget>;
  deleteBudget(id: number): Promise<void>;
  
  // Goal management
  getGoals(userId: number, monthId: string): Promise<Goal[]>;
  getGoal(id: number): Promise<Goal | undefined>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal>;
  deleteGoal(id: number): Promise<void>;
  
  // Debt management
  getDebts(userId: number, monthId: string): Promise<Debt[]>;
  getDebt(id: number): Promise<Debt | undefined>;
  createDebt(debt: InsertDebt): Promise<Debt>;
  updateDebt(id: number, debt: Partial<InsertDebt>): Promise<Debt>;
  deleteDebt(id: number): Promise<void>;
  
  // Recommendation management
  getRecommendations(userId: number, monthId: string): Promise<Recommendation[]>;
  markRecommendationAsRead(id: number): Promise<void>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  
  // Alert management
  getAlerts(userId: number, monthId: string): Promise<Alert[]>;
  markAlertAsRead(id: number): Promise<void>;
  clearAllAlerts(userId: number, monthId: string): Promise<void>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  
  // Scenario management
  getScenarios(userId: number): Promise<Scenario[]>;
  getScenario(id: number): Promise<Scenario | undefined>;
  createScenario(scenario: InsertScenario): Promise<Scenario>;
  updateScenario(id: number, scenario: Partial<InsertScenario>): Promise<Scenario>;
  deleteScenario(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  // User profile management
  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }
  
  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [createdProfile] = await db.insert(userProfiles).values(profile).returning();
    return createdProfile;
  }
  
  async updateUserProfile(userId: number, profile: Partial<InsertUserProfile>): Promise<UserProfile> {
    const [updatedProfile] = await db
      .update(userProfiles)
      .set({
        ...profile,
        updatedAt: new Date()
      })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updatedProfile;
  }
  
  // Month management
  async getMonths(userId: number): Promise<Month[]> {
    return db
      .select()
      .from(months)
      .where(eq(months.userId, userId));
  }
  
  async getMonth(userId: number, monthId: string): Promise<Month | undefined> {
    const results = await db
      .select()
      .from(months)
      .where(and(
        eq(months.userId, userId),
        eq(months.id, monthId)
      ));
    return results.length > 0 ? results[0] : undefined;
  }
  
  async createMonth(month: InsertMonth): Promise<Month> {
    const [createdMonth] = await db.insert(months).values(month).returning();
    return createdMonth;
  }
  
  async setActiveMonth(userId: number, monthId: string): Promise<void> {
    // First, set all months for this user as inactive
    await db
      .update(months)
      .set({ isActive: false })
      .where(eq(months.userId, userId));
    
    // Then set the specified month as active
    await db
      .update(months)
      .set({ isActive: true })
      .where(eq(months.id, monthId))
      .where(eq(months.userId, userId));
  }
  
  // Income management
  async getIncomes(userId: number, monthId: string): Promise<Income[]> {
    const results = await db
      .select()
      .from(incomes)
      .where(eq(incomes.userId, userId))
      .where(eq(incomes.monthId, monthId));
    return results;
  }
  
  async getIncome(id: number): Promise<Income | undefined> {
    const [income] = await db.select().from(incomes).where(eq(incomes.id, id));
    return income;
  }
  
  async createIncome(income: InsertIncome): Promise<Income> {
    const [createdIncome] = await db.insert(incomes).values(income).returning();
    return createdIncome;
  }
  
  async updateIncome(id: number, income: Partial<InsertIncome>): Promise<Income> {
    const [updatedIncome] = await db
      .update(incomes)
      .set(income)
      .where(eq(incomes.id, id))
      .returning();
    return updatedIncome;
  }
  
  async deleteIncome(id: number): Promise<void> {
    await db.delete(incomes).where(eq(incomes.id, id));
  }
  
  // Expense management
  async getExpenses(userId: number, monthId: string): Promise<Expense[]> {
    return db
      .select()
      .from(expenses)
      .where(eq(expenses.userId, userId))
      .where(eq(expenses.monthId, monthId));
  }
  
  async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense;
  }
  
  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [createdExpense] = await db.insert(expenses).values(expense).returning();
    return createdExpense;
  }
  
  async updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense> {
    const [updatedExpense] = await db
      .update(expenses)
      .set(expense)
      .where(eq(expenses.id, id))
      .returning();
    return updatedExpense;
  }
  
  async deleteExpense(id: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }
  
  // Budget management
  async getBudgets(userId: number, monthId: string): Promise<Budget[]> {
    return db
      .select()
      .from(budgets)
      .where(eq(budgets.userId, userId))
      .where(eq(budgets.monthId, monthId));
  }
  
  async getBudget(id: number): Promise<Budget | undefined> {
    const [budget] = await db.select().from(budgets).where(eq(budgets.id, id));
    return budget;
  }
  
  async createBudget(budget: InsertBudget): Promise<Budget> {
    const [createdBudget] = await db.insert(budgets).values(budget).returning();
    return createdBudget;
  }
  
  async updateBudget(id: number, budget: Partial<InsertBudget>): Promise<Budget> {
    const [updatedBudget] = await db
      .update(budgets)
      .set(budget)
      .where(eq(budgets.id, id))
      .returning();
    return updatedBudget;
  }
  
  async deleteBudget(id: number): Promise<void> {
    await db.delete(budgets).where(eq(budgets.id, id));
  }
  
  // Goal management
  async getGoals(userId: number, monthId: string): Promise<Goal[]> {
    return db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .where(eq(goals.monthId, monthId));
  }
  
  async getGoal(id: number): Promise<Goal | undefined> {
    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    return goal;
  }
  
  async createGoal(goal: InsertGoal): Promise<Goal> {
    const [createdGoal] = await db.insert(goals).values(goal).returning();
    return createdGoal;
  }
  
  async updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal> {
    const [updatedGoal] = await db
      .update(goals)
      .set(goal)
      .where(eq(goals.id, id))
      .returning();
    return updatedGoal;
  }
  
  async deleteGoal(id: number): Promise<void> {
    await db.delete(goals).where(eq(goals.id, id));
  }
  
  // Debt management
  async getDebts(userId: number, monthId: string): Promise<Debt[]> {
    return db
      .select()
      .from(debts)
      .where(eq(debts.userId, userId))
      .where(eq(debts.monthId, monthId));
  }
  
  async getDebt(id: number): Promise<Debt | undefined> {
    const [debt] = await db.select().from(debts).where(eq(debts.id, id));
    return debt;
  }
  
  async createDebt(debt: InsertDebt): Promise<Debt> {
    const [createdDebt] = await db.insert(debts).values(debt).returning();
    return createdDebt;
  }
  
  async updateDebt(id: number, debt: Partial<InsertDebt>): Promise<Debt> {
    const [updatedDebt] = await db
      .update(debts)
      .set(debt)
      .where(eq(debts.id, id))
      .returning();
    return updatedDebt;
  }
  
  async deleteDebt(id: number): Promise<void> {
    await db.delete(debts).where(eq(debts.id, id));
  }
  
  // Recommendation management
  async getRecommendations(userId: number, monthId: string): Promise<Recommendation[]> {
    return db
      .select()
      .from(recommendations)
      .where(eq(recommendations.userId, userId))
      .where(eq(recommendations.monthId, monthId));
  }
  
  async markRecommendationAsRead(id: number): Promise<void> {
    await db
      .update(recommendations)
      .set({ read: true })
      .where(eq(recommendations.id, id));
  }
  
  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    const [createdRecommendation] = await db.insert(recommendations).values(recommendation).returning();
    return createdRecommendation;
  }
  
  // Alert management
  async getAlerts(userId: number, monthId: string): Promise<Alert[]> {
    return db
      .select()
      .from(alerts)
      .where(eq(alerts.userId, userId))
      .where(eq(alerts.monthId, monthId));
  }
  
  async markAlertAsRead(id: number): Promise<void> {
    await db
      .update(alerts)
      .set({ read: true })
      .where(eq(alerts.id, id));
  }
  
  async clearAllAlerts(userId: number, monthId: string): Promise<void> {
    await db
      .update(alerts)
      .set({ read: true })
      .where(eq(alerts.userId, userId))
      .where(eq(alerts.monthId, monthId));
  }
  
  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [createdAlert] = await db.insert(alerts).values(alert).returning();
    return createdAlert;
  }
  
  // Scenario management
  async getScenarios(userId: number): Promise<Scenario[]> {
    return db
      .select()
      .from(scenarios)
      .where(eq(scenarios.userId, userId));
  }
  
  async getScenario(id: number): Promise<Scenario | undefined> {
    const [scenario] = await db.select().from(scenarios).where(eq(scenarios.id, id));
    return scenario;
  }
  
  async createScenario(scenario: InsertScenario): Promise<Scenario> {
    const [createdScenario] = await db.insert(scenarios).values(scenario).returning();
    return createdScenario;
  }
  
  async updateScenario(id: number, scenario: Partial<InsertScenario>): Promise<Scenario> {
    const [updatedScenario] = await db
      .update(scenarios)
      .set(scenario)
      .where(eq(scenarios.id, id))
      .returning();
    return updatedScenario;
  }
  
  async deleteScenario(id: number): Promise<void> {
    await db.delete(scenarios).where(eq(scenarios.id, id));
  }
}

// Use database storage instead of memory storage
export const storage = new DatabaseStorage();
