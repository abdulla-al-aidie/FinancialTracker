import { 
  Income, 
  Expense, 
  Budget, 
  Goal, 
  IncomeType, 
  ExpenseCategory, 
  GoalType
} from "../types/finance";

// Function to get a random number between min and max
function getRandomAmount(min: number, max: number): number {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

// Generate sample incomes
export function generateSampleIncomes(monthId: string, count: number = 3): Income[] {
  const [year, month] = monthId.split('-');
  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  
  const incomeTypes = Object.values(IncomeType);
  const incomes: Income[] = [];
  
  for (let i = 0; i < count; i++) {
    const day = Math.floor(Math.random() * daysInMonth) + 1;
    const date = `${year}-${month}-${String(day).padStart(2, '0')}`;
    const type = incomeTypes[Math.floor(Math.random() * incomeTypes.length)];
    
    let amount = 0;
    let description = "";
    
    // Set realistic incomes based on type
    switch (type) {
      case IncomeType.Salary:
        amount = getRandomAmount(3000, 6000);
        description = "Monthly salary";
        break;
      case IncomeType.Freelance:
        amount = getRandomAmount(500, 2000);
        description = "Freelance project payment";
        break;
      case IncomeType.Investment:
        amount = getRandomAmount(100, 1000);
        description = "Investment returns";
        break;
      case IncomeType.Gift:
        amount = getRandomAmount(50, 300);
        description = "Birthday gift";
        break;
      default:
        amount = getRandomAmount(100, 500);
        description = "Miscellaneous income";
    }
    
    incomes.push({
      id: i + 1,
      amount,
      date,
      type,
      description
    });
  }
  
  return incomes;
}

// Generate sample expenses
export function generateSampleExpenses(monthId: string, count: number = 12): Expense[] {
  const [year, month] = monthId.split('-');
  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  
  const categories = Object.values(ExpenseCategory);
  const expenses: Expense[] = [];
  
  // Ensure we have at least one expense for most categories
  const usedCategories = new Set<ExpenseCategory>();
  
  for (let i = 0; i < count; i++) {
    const day = Math.floor(Math.random() * daysInMonth) + 1;
    const date = `${year}-${month}-${String(day).padStart(2, '0')}`;
    
    // Try to use unique categories until we've covered most of them
    let category: ExpenseCategory;
    if (usedCategories.size < categories.length * 0.7 && i < categories.length) {
      do {
        category = categories[Math.floor(Math.random() * categories.length)];
      } while (usedCategories.has(category));
      usedCategories.add(category);
    } else {
      category = categories[Math.floor(Math.random() * categories.length)];
    }
    
    let amount = 0;
    let description = "";
    
    // Set realistic expenses based on category
    switch (category) {
      case ExpenseCategory.Housing:
        amount = getRandomAmount(1000, 2000);
        description = "Monthly rent";
        break;
      case ExpenseCategory.Transportation:
        amount = getRandomAmount(100, 400);
        description = Math.random() > 0.5 ? "Gas" : "Public transport pass";
        break;
      case ExpenseCategory.Food:
        amount = getRandomAmount(50, 200);
        description = Math.random() > 0.5 ? "Grocery shopping" : "Restaurant meal";
        break;
      case ExpenseCategory.Healthcare:
        amount = getRandomAmount(50, 300);
        description = "Medical appointment";
        break;
      case ExpenseCategory.Insurance:
        amount = getRandomAmount(100, 300);
        description = "Insurance premium";
        break;
      case ExpenseCategory.Debt:
        amount = getRandomAmount(200, 500);
        description = "Student loan payment";
        break;
      case ExpenseCategory.Personal:
        amount = getRandomAmount(50, 200);
        description = "Personal care products";
        break;
      case ExpenseCategory.Entertainment:
        amount = getRandomAmount(20, 150);
        description = "Movie tickets";
        break;
      case ExpenseCategory.Gifts:
        amount = getRandomAmount(30, 100);
        description = "Birthday gift";
        break;
      case ExpenseCategory.Education:
        amount = getRandomAmount(50, 300);
        description = "Online course";
        break;
      default:
        amount = getRandomAmount(20, 100);
        description = "Miscellaneous expense";
    }
    
    expenses.push({
      id: i + 1,
      amount,
      date,
      category,
      description
    });
  }
  
  return expenses;
}

// Generate sample budgets based on expenses
export function generateSampleBudgets(expenses: Expense[]): Budget[] {
  const categories = Object.values(ExpenseCategory);
  const budgets: Budget[] = [];
  
  const expensesByCategory = new Map<ExpenseCategory, number>();
  
  // Calculate total spent per category
  expenses.forEach(expense => {
    const current = expensesByCategory.get(expense.category) || 0;
    expensesByCategory.set(expense.category, current + expense.amount);
  });
  
  // Create budgets with limits slightly above or below actual spending
  categories.forEach(category => {
    const spent = expensesByCategory.get(category) || 0;
    
    // Only create budget if there are expenses in this category
    if (spent > 0) {
      // Set limit randomly above or below spent amount
      const variance = Math.random() > 0.7 ? 0.8 : 1.2; // 30% chance to be over budget
      const limit = Math.round(spent * variance);
      
      budgets.push({
        category,
        limit,
        spent
      });
    }
  });
  
  return budgets;
}

// Generate sample goals
export function generateSampleGoals(): Goal[] {
  const goals: Goal[] = [
    {
      id: 1,
      type: GoalType.Saving,
      name: "Emergency Fund",
      targetAmount: 10000,
      currentAmount: 2500,
      targetDate: "2023-12-31",
      description: "Build a 6-month emergency fund"
    },
    {
      id: 2,
      type: GoalType.Saving,
      name: "Vacation",
      targetAmount: 3000,
      currentAmount: 1200,
      targetDate: "2023-08-15",
      description: "Summer vacation to Europe"
    },
    {
      id: 3,
      type: GoalType.DebtPayoff,
      name: "Credit Card Debt",
      targetAmount: 5000,
      currentAmount: 1800,
      targetDate: "2023-11-30",
      description: "Pay off high-interest credit card debt"
    },
    {
      id: 4,
      type: GoalType.Saving,
      name: "New Laptop",
      targetAmount: 1500,
      currentAmount: 300,
      targetDate: "2023-09-30",
      description: "Save for a new work laptop"
    }
  ];
  
  return goals;
}

// Random progress for goals in each month
export function updateGoalProgress(goals: Goal[], monthIndex: number): Goal[] {
  return goals.map(goal => {
    // Calculate progress based on month index (0-3 for Jan-Apr)
    const progressPercentage = Math.min((monthIndex + 1) * 0.15, 0.9); // Max 90% progress by April
    const newAmount = Math.min(
      Math.round(goal.targetAmount * progressPercentage),
      goal.targetAmount
    );
    
    return {
      ...goal,
      currentAmount: newAmount
    };
  });
}