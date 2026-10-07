export type Meta = {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
};
export type Profile = {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  preferredLanguage: "bn" | "en" | "bn-BD";
};
export type TransactionType =
  | "CASH_IN"
  | "CASH_OUT"
  | "MERCHANT_PAY"
  | "MOBILE_RECHARGE";
export type Category = {
  categoryId: string;
  categoryName: string;
  categoryType: "income" | "expense";
  description: string | null;
  isActive: boolean;
};
export type Transaction = {
  transactionId: string;
  categoryId: string;
  categoryName?: string;
  categoryType?: string;
  transactionType: TransactionType;
  amount: number;
  merchantName: string | null;
  description: string | null;
  transactionDate: string;
  source: string;
  createdAt: string;
};
export type Goal = {
  goalId: string;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  targetDate: string;
  requiredMonthlySaving: number;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  progressPercentage: number;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
};
export type Contribution = {
  contributionId: string;
  goalId: string;
  transactionId: string | null;
  amount: number;
  contributionDate: string;
};
export type Recommendation = {
  recommendationId: string;
  recommendationType: string;
  recommendationText: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "NEW" | "VIEWED" | "COMPLETED" | "DISMISSED";
  createdAt: string;
};
export type Conversation = {
  conversationId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};
export type Message = {
  messageId: string;
  conversationId: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  message: string;
  createdAt: string;
};
export type CoachAnswer = {
  conversationId: string;
  userMessage: Message;
  assistantMessage: Message;
  recommendations: Recommendation[];
};
export type Insight = {
  insightId: string;
  insightType: string;
  title: string;
  description: string;
  metadata: unknown;
  createdAt: string;
};
export type Dashboard = {
  balance: number;
  totalIncome: number;
  totalExpenses: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyNetCashFlow: number;
  totalSaved: number;
  goalCount: number;
  goals: Goal[];
  latestInsights: Insight[];
  recentTransactions: Transaction[];
};
export type Spending = {
  period: {
    startDate: string;
    endDate: string;
    days: number;
    timeZone: string;
  };
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  transactionCount: number;
  categorySpending: {
    categoryId: string;
    categoryName: string;
    totalSpent: number;
    transactionCount: number;
    percentage: number;
  }[];
  spendingTrends: {
    month: string;
    totalIncome: number;
    totalExpenses: number;
    netCashFlow: number;
    transactionCount: number;
  }[];
  comparison: {
    incomeChangePercent: number | null;
    expenseChangePercent: number | null;
  };
  calculationVersion: string;
};
export type Health = {
  healthId?: string | null;
  healthScore: number;
  savingsScore: number;
  spendingScore: number;
  goalScore: number;
  emergencyScore: number;
  assessmentDate: string;
  limitations?: string[];
};
export type SavingsPlan = Goal & {
  period: Spending["period"];
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  monthlyNetCashFlow: number;
  availableMonthlySaving: number;
  monthlySavingsGap: number;
  projectedMonthlySaving: number;
  remainingMonthlyGap: number;
  feasibleByTargetDate: boolean;
  projectedMonthsToGoal: number | null;
  categoryBudgets: {
    categoryId: string;
    categoryName: string;
    averageMonthlySpending: number;
    suggestedMonthlyBudget: number;
    potentialMonthlySaving: number;
  }[];
  notes: string[];
  assumptions: {
    spendingReductionPercent: number;
    averagingMonthDays: number;
  };
};
export type Simulation = {
  projectedMonthlySaving: number;
  requestedMonthlySaving: number;
  monthlyNetCashFlow: number;
  monthlyDeficit: number;
  projectedSavings: number;
  horizonMonths: number;
  goalId: string | null;
  remainingAmount: number | null;
  monthsToGoal: number | null;
  projectedGoalDate: string | null;
  limitations: string[];
};
export type Affordability = {
  purchaseAmount: number;
  canAfford: boolean;
  decision: "AFFORDABLE" | "CAUTION" | "NOT_AFFORDABLE" | "INSUFFICIENT_DATA";
  recordedCashFlowBalance: number;
  reservedGoalSavings: number;
  emergencyBuffer: number;
  availableForPurchase: number;
  balanceAfterPurchase: number;
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  monthlyNetCashFlow: number;
  selectedGoalMonthlyRequirement: number;
  period: Spending["period"];
  assumptions: {
    emergencyBufferMonths: number;
  };
  limitations: string[];
  explanation: string | null;
};
