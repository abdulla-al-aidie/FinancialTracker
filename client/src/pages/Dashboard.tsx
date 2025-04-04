import { useState } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DollarSign,
  CreditCard,
  PiggyBank,
  BarChart as ChartIcon,
  Target,
  Settings2,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  ShoppingBag,
  TrendingUp,
  Landmark,
  CalendarDays,
  PlusCircle,
  FileText,
  Trash2,
  Mail,
  Bell,
  BookOpen
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExpenseCategory, GoalType, Budget, Goal, Income, Expense, Debt, IncomeType } from "@/types/finance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";

import GoalFormModal from "@/components/GoalFormModal";
import IncomeFormModal from "@/components/IncomeFormModal";
import ExpenseFormModal from "@/components/ExpenseFormModal";
import DebtFormModal from "@/components/DebtFormModal";
import DebtPaymentModal from "@/components/DebtPaymentModal";
import ProfileModal from "@/components/ProfileModal";
import CurrencyModal from "@/components/CurrencyModal";
import ReportGeneratorModal from "@/components/ReportGeneratorModal";
import AIGoalPrioritization from "@/components/AIGoalPrioritization";
import AISpendingOptimization from "@/components/AISpendingOptimization";
import FinancialHealthAssessment from "@/components/FinancialHealthAssessment";
import ActionableRecommendations from "@/components/ActionableRecommendations";
import MonthSelector from "@/components/MonthSelector";
import EmailSettingsModal from "@/components/EmailSettingsModal";
import AlertPreferencesModal from "@/components/AlertPreferencesModal";


export default function Dashboard() {
  const { 
    totalIncome, 
    totalExpenses, 
    netCashflow,
    savingsRate, 
    incomes = [],
    expenses = [],
    budgets = [],
    goals = [],
    debts = [],
    recommendations = [],
    alerts = [],
    deleteDebt,
    activeMonth,
    userProfile
  } = useFinance();
  
  const [activeTab, setActiveTab] = useState("overview");
  
  // State for modal visibility
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [debtPaymentModalOpen, setDebtPaymentModalOpen] = useState(false);
  
  // State for settings modals
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [generateReportModalOpen, setGenerateReportModalOpen] = useState(false);
  const [emailSettingsModalOpen, setEmailSettingsModalOpen] = useState(false);
  const [alertPreferencesModalOpen, setAlertPreferencesModalOpen] = useState(false);
  
  // State for selected items for editing
  const [selectedGoal, setSelectedGoal] = useState<Goal | undefined>(undefined);
  const [selectedIncome, setSelectedIncome] = useState<Income | undefined>(undefined);
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>(undefined);
  const [selectedDebt, setSelectedDebt] = useState<Debt | undefined>(undefined);
  
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
    // Make sure expenses is an array before using filter
    const categoryExpenses = Array.isArray(expenses) 
      ? expenses.filter(expense => expense.category === category)
      : [];
      
    const totalForCategory = categoryExpenses.reduce(
      (total, expense) => total + expense.amount, 0
    );
    
    return {
      name: category,
      value: totalForCategory
    };
  }).filter(item => item.value > 0);
  
  // Get recommendations with unread first
  const sortedRecommendations = Array.isArray(recommendations)
    ? [...recommendations].sort((a, b) => {
        if (a.isRead && !b.isRead) return 1;
        if (!a.isRead && b.isRead) return -1;
        return new Date(b.dateGenerated).getTime() - new Date(a.dateGenerated).getTime();
      })
    : [];
  
  // Get unread alerts
  const unreadAlerts = Array.isArray(alerts) 
    ? alerts.filter(alert => !alert.isRead) 
    : [];
  
  // Get active month data for the chart
  const { months } = useFinance();
  const activeMonthName = months.find(month => month.id === activeMonth)?.name || 'Current Month';
  
  // Prepare cashflow data for the active month only
  const cashflowData = [
    { 
      month: activeMonthName, 
      income: totalIncome, 
      expenses: totalExpenses 
    }
  ];
  
  // Budget utilization data
  const budgetData = Array.isArray(budgets)
    ? budgets.map(budget => ({
        category: budget.category,
        limit: budget.limit,
        spent: budget.spent,
        percent: budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0
      })).sort((a, b) => b.percent - a.percent)
    : [];


  
  // Handler for goal clicking
  const handleGoalClick = (goal: Goal) => {
    setSelectedGoal(goal);
    setGoalModalOpen(true);
  };
  
  // Handler for income clicking
  const handleIncomeClick = (income: Income) => {
    setSelectedIncome(income);
    setIncomeModalOpen(true);
  };
  
  // Handler for expense clicking
  const handleExpenseClick = (expense: Expense) => {
    setSelectedExpense(expense);
    setExpenseModalOpen(true);
  };
  
  // Handler for debt clicking
  const handleDebtClick = (debt: Debt) => {
    setSelectedDebt(debt);
    setDebtModalOpen(true);
  };
  
  // Handler for debt payment
  const handleDebtPayment = (debt: Debt) => {
    setSelectedDebt(debt);
    setDebtPaymentModalOpen(true);
  };
  
  // Handler for generating monthly financial report
  const handleGenerateReport = () => {
    setGenerateReportModalOpen(true);
  };
  
  // Handler for edit profile
  const handleEditProfile = () => {
    setProfileModalOpen(true);
  };
  
  // Handler for change currency
  const handleChangeCurrency = () => {
    setCurrencyModalOpen(true);
  };
  
  // Handler for debt deletion
  const handleDeleteDebt = (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Prevent parent click event (edit debt)
    if (window.confirm("Are you sure you want to delete this debt? This action cannot be undone.")) {
      deleteDebt(id);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <ChartIcon className="text-primary h-6 w-6 mr-2" />
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
          <Card className="border-emerald-200">
            <CardContent className="p-4 flex flex-col">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">Total Income</p>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-1">
                <p className="text-2xl font-semibold text-emerald-600">{formatCurrency(totalIncome)}</p>
              </div>
              <div className="mt-1 flex items-center">
                <Badge variant="outline" className="text-emerald-500 border-emerald-200 text-xs">
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
          <TabsList className="grid w-full grid-cols-6 md:grid-cols-7 lg:w-auto">
            <TabsTrigger value="overview" className="flex items-center">
              <ChartIcon className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Transactions</span>
            </TabsTrigger>
            <TabsTrigger value="debts" className="flex items-center">
              <Landmark className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Debts</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center">
              <Target className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Goals</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center">
              <PiggyBank className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center">
              <BookOpen className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Knowledge</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="hidden md:flex md:items-center">
              <Settings2 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Welcome Message */}
            <h1 className="text-3xl font-bold mb-4">
              {userProfile && userProfile.name ? `Welcome, ${userProfile.name}!` : 'Welcome!'}
            </h1>
            
            {/* Month Selector */}
            <MonthSelector />
            
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
                            cx="45%"
                            cy="45%"
                            labelLine={true}
                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                            outerRadius={90}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {expensesByCategory.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Legend 
                            layout="horizontal" 
                            verticalAlign="bottom" 
                            align="center"
                            iconSize={8}
                            wrapperStyle={{
                              fontSize: '10px',
                              paddingTop: '10px'
                            }} 
                          />
                          <Tooltip 
                            formatter={(value) => formatCurrency(Number(value))}
                            labelFormatter={(name) => `${name}`} 
                          />
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
                  <CardDescription>Current month's financial breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={cashflowData}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Legend />
                        <Bar 
                          dataKey="income" 
                          name="Income" 
                          fill="#3B82F6"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar 
                          dataKey="expenses" 
                          name="Expenses" 
                          fill="#EF4444"
                          radius={[4, 4, 0, 0]}  
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            

          </TabsContent>
          
          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <h1 className="text-3xl font-bold mb-4">Transactions</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Add Transaction Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Add Transaction</CardTitle>
                  <CardDescription>Record a new expense or income</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Transaction Type Tabs */}
                  <Tabs defaultValue="expense" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="expense">Expense</TabsTrigger>
                      <TabsTrigger value="income">Income</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="expense" className="space-y-4 pt-4">
                      <div className="py-4 text-center">
                        <div className="mb-4">
                          <ShoppingBag className="h-12 w-12 mx-auto text-red-500" />
                          <h3 className="mt-2 text-lg font-medium">Track Your Expenses</h3>
                          <p className="text-sm text-gray-500">Record purchases, bills, and other spending</p>
                        </div>
                        <Button 
                          className="w-full bg-slate-900" 
                          size="lg"
                          onClick={() => {
                            setSelectedExpense(undefined);
                            setExpenseModalOpen(true);
                          }}
                        >
                          Add Expense
                        </Button>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="income" className="space-y-4 pt-4">
                      <div className="py-4 text-center">
                        <div className="mb-4">
                          <DollarSign className="h-12 w-12 mx-auto text-emerald-600" />
                          <h3 className="mt-2 text-lg font-medium">Record Your Income</h3>
                          <p className="text-sm text-gray-500">Track your salary, investments, and other earnings</p>
                        </div>
                        <Button 
                          className="w-full" 
                          size="lg"
                          onClick={() => {
                            setSelectedIncome(undefined);
                            setIncomeModalOpen(true);
                          }}
                        >
                          Add Income
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
              
              {/* Transactions Tabs */}
              <Card>
                <CardHeader>
                  <CardTitle>Transactions</CardTitle>
                  <CardDescription>View and manage your transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="income" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="income">Income</TabsTrigger>
                      <TabsTrigger value="expenses">Expenses</TabsTrigger>
                    </TabsList>
                    
                    {/* Income Tab */}
                    <TabsContent value="income">
                      <div className="flex flex-col gap-4">
                        <Input placeholder="Search income..." />
                      </div>
                      
                      {incomes.length > 0 ? (
                        <div className="space-y-4 mt-4">
                          {/* Show incomes sorted by date */}
                          {[...incomes]
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((income) => (
                              <div 
                                key={income.id} 
                                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                                onClick={() => handleIncomeClick(income)}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="p-2 rounded-full bg-emerald-100">
                                    <DollarSign className="h-4 w-4 text-emerald-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{income.description}</p>
                                    <p className="text-xs text-gray-500">{income.type} • {new Date(income.date).toLocaleDateString()}</p>
                                  </div>
                                </div>
                                <p className="text-sm font-semibold text-emerald-600">{formatCurrency(income.amount)}</p>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="text-center py-10">
                          <DollarSign className="mx-auto h-10 w-10 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No income entries</h3>
                          <p className="mt-1 text-sm text-gray-500">Add income to see them here.</p>
                        </div>
                      )}
                    </TabsContent>
                    
                    {/* Expenses Tab */}
                    <TabsContent value="expenses">
                      <div className="flex flex-col gap-4">
                        <Input placeholder="Search expenses..." />
                      </div>
                      
                      {expenses.length > 0 ? (
                        <div className="space-y-4 mt-4">
                          {/* Show expenses sorted by date */}
                          {[...expenses]
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((expense) => (
                              <div 
                                key={expense.id} 
                                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                                onClick={() => handleExpenseClick(expense)}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="p-2 rounded-full bg-red-100">
                                    <ShoppingBag className="h-4 w-4 text-red-500" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{expense.description}</p>
                                    <p className="text-xs text-gray-500">{expense.category} • {new Date(expense.date).toLocaleDateString()}</p>
                                  </div>
                                </div>
                                <p className="text-sm font-semibold text-red-600">{formatCurrency(expense.amount)}</p>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="text-center py-10">
                          <ShoppingBag className="mx-auto h-10 w-10 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No expense entries</h3>
                          <p className="mt-1 text-sm text-gray-500">Add expenses to see them here.</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Debts Tab */}
          <TabsContent value="debts" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Debt Tracker</CardTitle>
                  <CardDescription>Monitor and manage all your debts</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-1"
                  onClick={() => {
                    setSelectedDebt(undefined);
                    setDebtModalOpen(true);
                  }}
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Add</span>
                </Button>
              </CardHeader>
              <CardContent>
                {debts.length > 0 ? (
                  <div className="space-y-4">
                    {debts.map((debt) => (
                      <div 
                        key={debt.id} 
                        className="border rounded-lg shadow-sm hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleDebtClick(debt)}
                      >
                        <div className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium">{debt.name}</h3>
                                {/* Show paid off indicator when appropriate */}
                                {debt.isPaidOff && (
                                  <Badge variant="outline" className="bg-green-500 text-white">
                                    PAID OFF
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">Due: {new Date(debt.dueDate).toLocaleDateString()}</p>
                              {debt.priority !== undefined && (
                                <Badge variant="secondary" className="mt-1">
                                  Priority: {debt.priority}/10
                                </Badge>
                              )}
                            </div>
                            <Badge variant="outline" className="text-red-500">
                              {debt.interestRate}% APR
                            </Badge>
                          </div>
                          
                          {/* Improved progress bar for debt tracking with monthly payments */}
                          <div className="mt-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-gray-500">Repayment Progress</span>
                              {/* Calculate percentage based on monthly payments data */}
                              <span className="text-xs font-medium">
                                {(() => {
                                  // Get all monthly payments and sum them
                                  const monthlyPayments = debt.monthlyPayments || {};
                                  const totalPaid = Object.values(monthlyPayments).reduce(
                                    (sum, amount) => sum + amount, 0
                                  );
                                  // Calculate progress percentage
                                  return debt.originalPrincipal > 0 
                                    ? Math.min(100, Math.round((totalPaid / debt.originalPrincipal) * 100)) 
                                    : 0;
                                })()}%
                              </span>
                            </div>
                            <Progress 
                              value={(() => {
                                // Calculate progress percentage for the progress bar
                                const monthlyPayments = debt.monthlyPayments || {};
                                const totalPaid = Object.values(monthlyPayments).reduce(
                                  (sum, amount) => sum + amount, 0
                                );
                                return debt.originalPrincipal > 0 
                                  ? Math.min(100, Math.round((totalPaid / debt.originalPrincipal) * 100))
                                  : 0;
                              })()} 
                              className={`h-2 ${debt.isPaidOff ? 'bg-green-100' : ''}`}
                              // Use a class in Tailwind instead of indicatorClassName
                              style={{ 
                                '--indicator-color': debt.isPaidOff ? '#10B981' : undefined 
                              } as React.CSSProperties}
                            />
                            
                            {/* Payment summary - show both total and monthly */}
                            <div className="flex justify-between text-xs mt-2">
                              <div>
                                <span className="text-gray-500 mr-1">Repaid:</span>
                                <span className="font-medium text-emerald-600">
                                  {formatCurrency((() => {
                                    const monthlyPayments = debt.monthlyPayments || {};
                                    return Object.values(monthlyPayments).reduce(
                                      (sum, amount) => sum + amount, 0
                                    );
                                  })())}
                                </span>
                                <span className="text-gray-500 text-xs ml-1">total</span>
                              </div>
                              
                              {/* Show month-specific payment information if available */}
                              {debt.monthlyPayments && debt.monthlyPayments[activeMonth] !== undefined && debt.monthlyPayments[activeMonth] > 0 && (
                                <div>
                                  <span className="text-gray-500 mr-1">This month:</span>
                                  <span className="font-medium">{formatCurrency(debt.monthlyPayments[activeMonth])}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-3 grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500">Current Balance</p>
                              <p className="text-sm font-medium">
                                {formatCurrency((() => {
                                  // Get the month-specific balance if available
                                  if (debt.monthlyBalances && debt.monthlyBalances[activeMonth] !== undefined) {
                                    return debt.monthlyBalances[activeMonth];
                                  }
                                  
                                  // If no month-specific balance, calculate it from monthly payments
                                  const monthlyPayments = debt.monthlyPayments || {};
                                  // Sum all payments to get total paid
                                  const totalPaid = Object.values(monthlyPayments).reduce(
                                    (sum, amount) => sum + amount, 0
                                  );
                                  
                                  // Return original balance minus total payments
                                  return Math.max(0, debt.originalPrincipal - totalPaid);
                                })())}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Minimum Payment</p>
                              <p className="text-sm font-medium">{formatCurrency(debt.minimumPayment)}</p>
                            </div>
                          </div>
                          <div className="mt-3 border-t pt-3 flex justify-between">
                            <Button
                              variant="destructive"
                              size="sm"
                              className="gap-1"
                              onClick={(e) => handleDeleteDebt(e, debt.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="gap-1"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent parent click event (edit debt)
                                handleDebtPayment(debt);
                              }}
                            >
                              <DollarSign className="h-3.5 w-3.5" />
                              <span>Make Payment</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Landmark className="mx-auto h-10 w-10 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No debts</h3>
                    <p className="mt-1 text-sm text-gray-500">Track your loans, credit cards, and other debts.</p>
                    <div className="mt-6">
                      <Button
                        onClick={() => {
                          setSelectedDebt(undefined);
                          setDebtModalOpen(true);
                        }}
                      >
                        Add Debt
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-4">
            <div className="grid gap-4 grid-cols-1 xl:grid-cols-5">
              {/* Goal List */}
              <Card className="xl:col-span-2">
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
                              
                              {/* Calculate total progress from monthly data */}
                              {(() => {
                                // Get all monthly progress values and sum them
                                const monthlyProgress = goal.monthlyProgress || {};
                                const totalProgress = Object.values(monthlyProgress).reduce(
                                  (sum, amount) => sum + amount, 0
                                );
                                return (
                                  <p className="text-sm font-bold text-emerald-600">
                                    {formatCurrency(totalProgress)}
                                    <span className="text-xs font-normal text-gray-500 ml-1">total progress</span>
                                  </p>
                                );
                              })()}
                              
                              {/* Show month-specific progress if available */}
                              {goal.monthlyProgress && goal.monthlyProgress[activeMonth] !== undefined && (
                                <p className="text-xs mt-1">
                                  <span className="font-medium">{formatCurrency(goal.monthlyProgress[activeMonth])}</span>
                                  <span className="text-gray-500 ml-1">contributed this month</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Overall Progress</span>
                              <span>
                                {(() => {
                                  // Calculate percentage from monthly data
                                  const monthlyProgress = goal.monthlyProgress || {};
                                  const totalProgress = Object.values(monthlyProgress).reduce(
                                    (sum, amount) => sum + amount, 0
                                  );
                                  return ((totalProgress / goal.targetAmount) * 100).toFixed(1);
                                })()}%
                              </span>
                            </div>
                            <Progress 
                              value={(() => {
                                // Calculate percentage for progress bar
                                const monthlyProgress = goal.monthlyProgress || {};
                                const totalProgress = Object.values(monthlyProgress).reduce(
                                  (sum, amount) => sum + amount, 0
                                );
                                return (totalProgress / goal.targetAmount) * 100;
                              })()} 
                              className="h-2" 
                            />
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
              
              {/* AI Goal Prioritization */}
              <div className="xl:col-span-3">
                <AIGoalPrioritization />
              </div>
            </div>
          </TabsContent>
          
          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            {/* Financial Health Assessment component */}
            <FinancialHealthAssessment />
            
            {/* AI Spending Optimization component */}
            <AISpendingOptimization />
          </TabsContent>
          
          {/* Knowledge Hub Tab */}
          <TabsContent value="knowledge" className="space-y-4">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center">
                <h1 className="text-3xl font-bold mr-2">Knowledge Hub</h1>
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <p className="text-muted-foreground">
                Ask questions about personal finance and get expert answers powered by AI
              </p>
              
              <Button 
                variant="outline" 
                className="w-fit"
                onClick={() => window.location.href = "/knowledge-hub"}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Open Knowledge Hub
              </Button>
              
              <Card>
                <CardHeader>
                  <CardTitle>Financial Learning Center</CardTitle>
                  <CardDescription>Enhance your financial literacy</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">
                    The Knowledge Hub provides expert answers to all your financial questions. Here are some topics you can explore:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">Investment Basics</h3>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Stock market fundamentals</li>
                        <li>• Retirement accounts (401k, IRA)</li>
                        <li>• Risk management strategies</li>
                        <li>• Asset allocation principles</li>
                      </ul>
                    </div>
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">Debt Management</h3>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Student loan repayment strategies</li>
                        <li>• Credit card debt elimination</li>
                        <li>• Mortgage refinancing options</li>
                        <li>• Debt consolidation approaches</li>
                      </ul>
                    </div>
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">Budgeting Techniques</h3>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Zero-based budgeting</li>
                        <li>• 50/30/20 rule implementation</li>
                        <li>• Expense tracking methods</li>
                        <li>• Emergency fund planning</li>
                      </ul>
                    </div>
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">Tax Planning</h3>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Tax-advantaged accounts</li>
                        <li>• Deduction and credit opportunities</li>
                        <li>• Capital gains strategies</li>
                        <li>• Tax-efficient investing</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={handleEditProfile}
                      >
                        Edit Profile
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={handleChangeCurrency}
                      >
                        Change Currency
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Monthly Reports</h3>
                    <div className="grid grid-cols-1 gap-2">
                      <Button 
                        variant="outline" 
                        className="w-full flex items-center justify-center gap-2"
                        onClick={handleGenerateReport}
                      >
                        <FileText className="h-4 w-4" />
                        <span>Generate Monthly Finance Report</span>
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Download a comprehensive report of your income, expenses, and savings for the current month
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Notifications</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setEmailSettingsModalOpen(true)}
                      >
                        Email Settings
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setAlertPreferencesModalOpen(true)}
                      >
                        Alert Preferences
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      

      
      {/* Goal Form Modal */}
      <GoalFormModal
        open={goalModalOpen}
        onClose={() => {
          setGoalModalOpen(false);
          // Reset selected goal when the modal is closed
          setSelectedGoal(undefined);
        }}
        goal={selectedGoal}
      />
      
      {/* Income Form Modal */}
      <IncomeFormModal
        open={incomeModalOpen}
        onClose={() => {
          setIncomeModalOpen(false);
          // Reset selected income when the modal is closed
          setSelectedIncome(undefined);
        }}
        income={selectedIncome}
      />
      
      {/* Expense Form Modal */}
      <ExpenseFormModal
        open={expenseModalOpen}
        onClose={() => {
          setExpenseModalOpen(false);
          // Reset selected expense when the modal is closed
          setSelectedExpense(undefined);
        }}
        expense={selectedExpense}
      />
      
      {/* Debt Form Modal */}
      <DebtFormModal
        open={debtModalOpen}
        onClose={() => {
          setDebtModalOpen(false);
          // Reset selected debt when the modal is closed
          setSelectedDebt(undefined);
        }}
        debt={selectedDebt}
      />
      
      {/* Debt Payment Modal */}
      {selectedDebt && (
        <DebtPaymentModal
          open={debtPaymentModalOpen}
          onClose={() => {
            setDebtPaymentModalOpen(false);
            // Don't reset the selected debt here, only in DebtFormModal
          }}
          debt={selectedDebt}
        />
      )}
      
      {/* Settings Modals */}
      <ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
      
      <CurrencyModal
        open={currencyModalOpen}
        onClose={() => setCurrencyModalOpen(false)}
      />
      
      <ReportGeneratorModal
        open={generateReportModalOpen}
        onClose={() => setGenerateReportModalOpen(false)}
      />
      
      {/* Email and Alert Settings Modals */}
      <EmailSettingsModal
        open={emailSettingsModalOpen}
        onClose={() => setEmailSettingsModalOpen(false)}
      />
      
      <AlertPreferencesModal
        open={alertPreferencesModalOpen}
        onClose={() => setAlertPreferencesModalOpen(false)}
      />
    </div>
  );
}