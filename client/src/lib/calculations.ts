import { LoanDetails, Payment } from "../types/loan";

/**
 * Calculate the remaining balance after all payments
 */
export function calculateRemainingBalance(
  loanDetails: LoanDetails,
  payments: Payment[]
): number {
  if (loanDetails.principal === 0) return 0;

  let balance = loanDetails.principal;
  const monthlyInterestRate = loanDetails.interestRate / 100 / 12;
  
  if (payments.length === 0) return balance;
  
  let lastDate = new Date(payments[0].date);
  // Process first payment
  balance -= payments[0].amount;
  
  // Process subsequent payments
  for (let i = 1; i < payments.length; i++) {
    const payment = payments[i];
    const currentDate = new Date(payment.date);
    
    // Calculate months between payments (simplified)
    const monthsDiff = monthsBetween(lastDate, currentDate);
    
    // Add interest for each month
    for (let j = 0; j < monthsDiff; j++) {
      balance += balance * monthlyInterestRate;
    }
    
    // Apply payment
    balance -= payment.amount;
    if (balance < 0) balance = 0;
    
    lastDate = currentDate;
  }
  
  return Math.max(0, balance);
}

/**
 * Calculate the percent paid off
 */
export function calculatePercentPaid(
  principal: number,
  currentBalance: number
): number {
  if (principal === 0) return 0;
  const percentPaid = 100 - (currentBalance / principal * 100);
  return Math.round(percentPaid);
}

/**
 * Calculate payoff date and time remaining
 */
export function calculatePayoffDate(
  currentBalance: number,
  monthlyPayment: number,
  interestRate: number
): { date: string; timeRemaining: string } {
  if (currentBalance === 0 || monthlyPayment === 0) {
    return { date: "-", timeRemaining: "-" };
  }
  
  // Simple calculation for remaining months based on current balance
  const monthlyInterestRate = interestRate / 100 / 12;
  let remainingMonths = 0;
  
  // Calculate remaining months using the formula for loan amortization
  if (monthlyInterestRate > 0) {
    remainingMonths = Math.ceil(
      Math.log(monthlyPayment / (monthlyPayment - currentBalance * monthlyInterestRate)) / 
      Math.log(1 + monthlyInterestRate)
    );
  } else {
    remainingMonths = Math.ceil(currentBalance / monthlyPayment);
  }
  
  // Handle edge cases
  if (!isFinite(remainingMonths) || remainingMonths < 0) {
    remainingMonths = 0;
  }
  
  // Calculate payoff date
  const today = new Date();
  const payoffDateObj = new Date(today);
  payoffDateObj.setMonth(today.getMonth() + remainingMonths);
  
  // Format the date as Month Year
  const date = payoffDateObj.toLocaleDateString("en-US", { 
    month: "long", 
    year: "numeric" 
  });
  
  // Calculate time remaining
  const years = Math.floor(remainingMonths / 12);
  const months = remainingMonths % 12;
  
  let timeRemaining = "";
  
  if (years > 0 && months > 0) {
    timeRemaining = `${years} ${years === 1 ? "year" : "years"} and ${months} ${months === 1 ? "month" : "months"} remaining`;
  } else if (years > 0) {
    timeRemaining = `${years} ${years === 1 ? "year" : "years"} remaining`;
  } else if (months > 0) {
    timeRemaining = `${months} ${months === 1 ? "month" : "months"} remaining`;
  } else {
    timeRemaining = "Loan fully paid!";
  }
  
  return { date, timeRemaining };
}

/**
 * Calculate the balance history for the chart
 */
export function calculateBalanceHistory(
  loanDetails: LoanDetails,
  payments: Payment[]
): { dates: string[]; balances: number[] } {
  const dates: string[] = [];
  const balances: number[] = [];
  
  if (payments.length === 0) {
    return { dates, balances };
  }
  
  // Start with loan principal
  let balance = loanDetails.principal;
  const monthlyInterestRate = loanDetails.interestRate / 100 / 12;
  
  // Sort payments by date
  const sortedPayments = [...payments].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Add starting point
  dates.push("Initial Balance");
  balances.push(balance);
  
  let lastDate = new Date(sortedPayments[0].date);
  lastDate.setMonth(lastDate.getMonth() - 1); // Start one month before first payment
  
  // Process each payment
  for (const payment of sortedPayments) {
    const currentDate = new Date(payment.date);
    
    // Calculate months between payments (simplified)
    const monthsDiff = monthsBetween(lastDate, currentDate);
    
    // Add interest for each month
    for (let i = 0; i < monthsDiff; i++) {
      balance += balance * monthlyInterestRate;
    }
    
    // Apply payment
    balance -= payment.amount;
    if (balance < 0) balance = 0;
    
    // Add data point
    dates.push(formatDate(payment.date));
    balances.push(balance);
    
    lastDate = currentDate;
  }
  
  // Add projection point if not paid off
  if (balance > 0 && loanDetails.monthlyPayment > 0) {
    const projectionDate = new Date(lastDate);
    projectionDate.setMonth(projectionDate.getMonth() + 6); // Project 6 months ahead
    
    dates.push(`${formatDate(projectionDate.toISOString().split("T")[0])} (projected)`);
    
    // Simple projection based on monthly payment
    let projectedBalance = balance;
    for (let i = 0; i < 6; i++) {
      projectedBalance += projectedBalance * monthlyInterestRate;
      projectedBalance -= loanDetails.monthlyPayment;
      if (projectedBalance < 0) {
        projectedBalance = 0;
        break;
      }
    }
    
    balances.push(projectedBalance);
  }
  
  return { dates, balances };
}

/**
 * Helper function to calculate months between two dates
 */
function monthsBetween(date1: Date, date2: Date): number {
  const yearDiff = date2.getFullYear() - date1.getFullYear();
  const monthDiff = date2.getMonth() - date1.getMonth();
  return Math.max(0, yearDiff * 12 + monthDiff);
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
