import { useState } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  DollarSign,
  CreditCard,
  PiggyBank,
  BarChart,
  Target,
  Settings2,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  ShoppingBag,
  TrendingUp
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExpenseCategory, GoalType, Budget, Goal } from "@/types/finance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import BudgetFormModal from "@/components/BudgetFormModal";
import GoalFormModal from "@/components/GoalFormModal";

export default function Dashboard() {
  const { 
    totalIncome, 
    totalExpenses, 
    netCashflow,
    savingsRate, 
    expenses,
    budgets,
    goals,
    recommendations,
    alerts
  } = useFinance();
  
  const [activeTab, setActiveTab] = useState("overview");
  
  // State for modal visibility
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  
  // State for selected budget or goal for editing
  const [selectedBudget, setSelectedBudget] = useState<Budget | undefined>(undefined);
  const [selectedGoal, setSelectedGoal] = useState<Goal | undefined>(undefined);
  
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };
  
  // Set up pie chart colors
  const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', 
    '#82CA9D', '#FFAF8A', '#D0ED57', '#FFC658', '#A28BFF', '#FF6B6B'
  ];
  
  // Prepare expense data for pie chart
  const expensesByCategory = Object.values(ExpenseCategory).map(category => {
    const totalForCategory = expenses
      .filter(expense => expense.category === category)
      .reduce((total, expense) => total + expense.amount, 0);
    
    return {
      name: category,
      value: totalForCategory
    };
  }).filter(item => item.value > 0);
  
  // Get recommendations with unread first
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    if (a.isRead && !b.isRead) return 1;
    if (!a.isRead && b.isRead) return -1;
    return new Date(b.dateGenerated).getTime() - new Date(a.dateGenerated).getTime();
  });
  
  // Get unread alerts
  const unreadAlerts = alerts.filter(alert => !alert.isRead);
  
  // Prepare cashflow data for line chart (mock data for now)
  const cashflowData = [
    { month: 'Jan', income: 4000, expenses: 2400 },
    { month: 'Feb', income: 3000, expenses: 2210 },
    { month: 'Mar', income: 2000, expenses: 2290 },
    { month: 'Apr', income: 2780, expenses: 2000 },
    { month: 'May', income: 1890, expenses: 2181 },
    { month: 'Jun', income: 2390, expenses: 2500 },
    { month: 'Jul', income: 3490, expenses: 2100 },
  ];
  
  // Mock budget utilization data (replace with actual data later)
  const budgetData = budgets.map(budget => ({
    category: budget.category,
    limit: budget.limit,
    spent: budget.spent,
    percent: budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0
  })).sort((a, b) => b.percent - a.percent);

  // Handler for budget clicking
  const handleBudgetClick = (budget: Budget) => {
    setSelectedBudget(budget);
    setBudgetModalOpen(true);
  };
  
  // Handler for goal clicking
  const handleGoalClick = (goal: Goal) => {
    setSelectedGoal(goal);
    setGoalModalOpen(true);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <BarChart className="text-primary h-6 w-6 mr-2" />
              <h1 className="text-xl font-bold text-gray-800">Finance Tracker</h1>
            </div>
            <div>
              <span className="text-sm text-gray-500">Your Financial Assistant</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Financial Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Income Card */}
          <Card>
            <CardContent className="p-4 flex flex-col">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">Total Income</p>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-1">
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(totalIncome)}</p>
              </div>
              <div className="mt-1 flex items-center">
                <Badge variant="outline" className="text-emerald-500 text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" /> Income
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          {/* Expenses Card */}
          <Card>
            <CardContent className="p-4 flex flex-col">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">Total Expenses</p>
                <ShoppingBag className="h-4 w-4 text-red-500" />
              </div>
              <div className="mt-1">
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className="mt-1 flex items-center">
                <Badge variant="outline" className="text-red-500 text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" /> Spending
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          {/* Net Cashflow Card */}
          <Card>
            <CardContent className="p-4 flex flex-col">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">Net Cashflow</p>
                {netCashflow >= 0 ? (
                  <ChevronUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="mt-1">
                <p className={`text-2xl font-semibold ${netCashflow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(netCashflow)}
                </p>
              </div>
              <div className="mt-1 flex items-center">
                <Badge 
                  variant="outline" 
                  className={`${netCashflow >= 0 ? 'text-emerald-500' : 'text-red-500'} text-xs`}
                >
                  {netCashflow >= 0 ? 'Positive' : 'Negative'} Cashflow
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          {/* Savings Rate Card */}
          <Card>
            <CardContent className="p-4 flex flex-col">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">Savings Rate</p>
                <PiggyBank className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-1">
                <p className="text-2xl font-semibold text-gray-900">{savingsRate.toFixed(1)}%</p>
              </div>
              <div className="mt-1">
                <Progress value={savingsRate} className="h-1.5" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Alerts Section (if any) */}
        {unreadAlerts.length > 0 && (
          <div className="mb-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Attention Needed</AlertTitle>
              <AlertDescription>
                {unreadAlerts[0].message}
                {unreadAlerts.length > 1 && ` (+ ${unreadAlerts.length - 1} more alerts)`}
              </AlertDescription>
            </Alert>
          </div>
        )}
        
        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-5 lg:w-auto">
            <TabsTrigger value="overview" className="flex items-center">
              <BarChart className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="budgets" className="flex items-center">
              <CreditCard className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Budgets</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center">
              <Target className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Goals</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center">
              <PiggyBank className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="hidden md:flex md:items-center">
              <Settings2 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Expense Breakdown Chart */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Expense Breakdown</CardTitle>
                  <CardDescription>How your expenses are distributed</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {expensesByCategory.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expensesByCategory}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {expensesByCategory.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">No expense data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Income vs Expense Chart */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Income vs Expenses</CardTitle>
                  <CardDescription>Monthly comparison of cash flow</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={cashflowData}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Line
                          type="monotone"
                          dataKey="income"
                          stroke="#3B82F6"
                          activeDot={{ r: 8 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="expenses" 
                          stroke="#EF4444" 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Recommendations Section */}
            <Card>
              <CardHeader>
                <CardTitle>Personalized Recommendations</CardTitle>
                <CardDescription>AI-generated insights to improve your finances</CardDescription>
              </CardHeader>
              <CardContent>
                {sortedRecommendations.length > 0 ? (
                  <div className="space-y-4">
                    {sortedRecommendations.slice(0, 3).map((rec) => (
                      <div 
                        key={rec.id} 
                        className={`p-4 rounded-lg border ${
                          rec.isRead ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-sm">{rec.type}</h3>
                          {!rec.isRead && (
                            <Badge variant="secondary" className="text-xs">New</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-600">{rec.description}</p>
                        <p className="mt-2 text-xs font-medium text-primary">{rec.impact}</p>
                      </div>
                    ))}
                    {sortedRecommendations.length > 3 && (
                      <Button variant="ghost" className="w-full text-sm">
                        Show {sortedRecommendations.length - 3} more recommendations
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No recommendations available yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Keep adding financial data to receive personalized insights
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Budgets Tab */}
          <TabsContent value="budgets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Budget Tracker</CardTitle>
                <CardDescription>Monitor your spending against budget limits</CardDescription>
              </CardHeader>
              <CardContent>
                {budgetData.length > 0 ? (
                  <div className="space-y-4">
                    {budgetData.map((budget) => (
                      <div 
                        key={budget.category} 
                        className="space-y-1 hover:bg-gray-50 rounded p-2 cursor-pointer"
                        onClick={() => {
                          // Find the original budget object to pass to the form
                          const originalBudget = budgets.find(b => b.category === budget.category);
                          if (originalBudget) {
                            handleBudgetClick(originalBudget);
                          }
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{budget.category}</span>
                          <span className="text-sm text-gray-500">
                            {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
                          </span>
                        </div>
                        <Progress 
                          value={budget.percent} 
                          className={`h-2 ${
                            budget.percent > 90 ? 'bg-red-100' : 
                            budget.percent > 75 ? 'bg-yellow-100' : 'bg-blue-100'
                          }`} 
                        />
                        <div className="flex justify-end">
                          <span className={`text-xs ${
                            budget.percent > 90 ? 'text-red-600' : 
                            budget.percent > 75 ? 'text-yellow-600' : 'text-blue-600'
                          }`}>
                            {budget.percent.toFixed(1)}% used
                          </span>
                        </div>
                      </div>
                    ))}
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        setSelectedBudget(undefined);
                        setBudgetModalOpen(true);
                      }}
                    >
                      Create New Budget
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <CreditCard className="mx-auto h-10 w-10 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No budgets set</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating your first budget</p>
                    <div className="mt-6">
                      <Button onClick={() => {
                        setSelectedBudget(undefined);
                        setBudgetModalOpen(true);
                      }}>
                        Create a Budget
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Financial Goals</CardTitle>
                <CardDescription>Track progress towards your saving and debt goals</CardDescription>
              </CardHeader>
              <CardContent>
                {goals.length > 0 ? (
                  <div className="space-y-5">
                    {goals.map((goal) => (
                      <div 
                        key={goal.id} 
                        className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleGoalClick(goal)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <Badge variant={goal.type === GoalType.Saving ? "outline" : "secondary"}>
                              {goal.type === GoalType.Saving ? 'Saving' : 'Debt Payoff'} Goal
                            </Badge>
                            <h3 className="text-lg font-medium mt-1">{goal.name}</h3>
                            <p className="text-sm text-gray-500">{goal.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Target: {formatCurrency(goal.targetAmount)}</p>
                            <p className="text-sm font-medium">
                              {formatCurrency(goal.currentAmount)} saved
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Progress</span>
                            <span>{((goal.currentAmount / goal.targetAmount) * 100).toFixed(1)}%</span>
                          </div>
                          <Progress value={(goal.currentAmount / goal.targetAmount) * 100} className="h-2" />
                        </div>
                        <div className="mt-3 text-xs text-gray-500 text-right">
                          Target date: {new Date(goal.targetDate).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedGoal(undefined);
                        setGoalModalOpen(true);
                      }}
                    >
                      Create New Goal
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Target className="mx-auto h-10 w-10 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No goals set</h3>
                    <p className="mt-1 text-sm text-gray-500">Create a goal for saving or paying off debt</p>
                    <div className="mt-6">
                      <Button onClick={() => {
                        setSelectedGoal(undefined);
                        setGoalModalOpen(true);
                      }}>
                        Create a Goal
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>AI Insights</CardTitle>
                <CardDescription>Personalized financial analysis and recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Sample insights */}
                  <Alert>
                    <AlertTitle>Spending Pattern</AlertTitle>
                    <AlertDescription>
                      Your spending on Entertainment has increased by 15% this month compared to your average.
                    </AlertDescription>
                  </Alert>
                  
                  <Alert>
                    <AlertTitle>Saving Opportunity</AlertTitle>
                    <AlertDescription>
                      Reducing your Food expenses by 10% would allow you to reach your Emergency Fund goal 2 months earlier.
                    </AlertDescription>
                  </Alert>
                  
                  <Alert>
                    <AlertTitle>Debt Strategy</AlertTitle>
                    <AlertDescription>
                      Increasing your monthly payment on your highest interest debt by $50 would save you $340 in interest over time.
                    </AlertDescription>
                  </Alert>
                  
                  <Button className="w-full" variant="outline">
                    Generate New Insights
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your preferences and profile</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Profile</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="w-full">Edit Profile</Button>
                      <Button variant="outline" className="w-full">Change Currency</Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Data Management</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="w-full">Export Data</Button>
                      <Button variant="outline" className="w-full">Import Data</Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Notifications</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="w-full">Email Settings</Button>
                      <Button variant="outline" className="w-full">Alert Preferences</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Budget Form Modal */}
      <BudgetFormModal
        open={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        budget={selectedBudget}
      />
      
      {/* Goal Form Modal */}
      <GoalFormModal
        open={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        goal={selectedGoal}
      />
    </div>
  );
}