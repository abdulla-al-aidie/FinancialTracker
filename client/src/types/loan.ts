export interface LoanDetails {
  principal: number;
  interestRate: number;
  monthlyPayment: number;
}

export interface Payment {
  id: number;
  amount: number;
  date: string;
}

export interface MilestoneNotification {
  show: boolean;
  message: string;
  milestone: number;
}
