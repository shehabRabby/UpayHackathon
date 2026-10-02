import { test, expect, type Page } from "@playwright/test";
import {
  transactionCreate,
  transactionPatch,
  goalCreate,
  goalPatch,
  contributionCreate,
  profileCreate,
} from "../lib/validation";
import {
  affordabilityInput,
  simulationInput,
  messageInput,
} from "../lib/phase56-validation";
import type {
  Goal,
  Profile,
  Transaction,
  Message,
  Conversation,
  Recommendation,
} from "../lib/frontend/types";

// All Auth/API calls are intercepted in this suite. No real Supabase users,
// database rows, or Gemini requests are created. Fixtures are isolated per test.
const userId = "00000000-0000-4000-8000-000000000001";
const goalId = "00000000-0000-4000-8000-000000000002";
const transactionId = "00000000-0000-4000-8000-000000000003";
const incomeId = "00000000-0000-4000-8000-000000000004";
const expenseId = "00000000-0000-4000-8000-000000000005";
const conversationId = "00000000-0000-4000-8000-000000000006";
const recommendationId = "00000000-0000-4000-8000-000000000007";
async function fixture(page: Page) {
  let profile: Profile | null = null;
  let transactions: Transaction[] = [],
    goals: Goal[] = [],
    messages: Message[] = [],
    conversations: Conversation[] = [],
    recommendations: Recommendation[] = [];
  const contributions: {
    contributionId: string;
    goalId: string;
    transactionId: null;
    amount: number;
    contributionDate: string;
  }[] = [];
  const history: unknown[] = [];
  const health = {
    healthId: "synthetic-health",
    healthScore: 20,
    savingsScore: 40,
    spendingScore: 40,
    goalScore: 0,
    emergencyScore: 0,
    assessmentDate: "2026-10-02",
    limitations: ["Illustrative wellness fixture"],
  };
  const spending = {
    period: {
      startDate: "2026-07-05",
      endDate: "2026-10-02",
      days: 90,
      timeZone: "Asia/Dhaka",
    },
    totalIncome: 1000,
    totalExpenses: 0,
    netCashFlow: 1000,
    transactionCount: transactions.length,
    categorySpending: [],
    spendingTrends: [
      {
        month: "2026-10",
        totalIncome: 1000,
        totalExpenses: 0,
        netCashFlow: 1000,
        transactionCount: transactions.length,
      },
    ],
    comparison: { incomeChangePercent: null, expenseChangePercent: null },
    calculationVersion: "spending-v1",
  };
  const categories = [
    {
      categoryId: incomeId,
      categoryName: "Cash In",
      categoryType: "income",
      description: null,
      isActive: true,
    },
    {
      categoryId: expenseId,
      categoryName: "Food",
      categoryType: "expense",
      description: null,
      isActive: true,
    },
  ];
  const now = () => new Date().toISOString();
  const user = {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    email: "demo@example.test",
    user_metadata: { full_name: "Demo Member" },
    app_metadata: { provider: "email", providers: ["email"] },
    created_at: now(),
  };
  const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: userId, aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600, role: "authenticated" })).toString("base64url")}.synthetic-signature`;
  await page.route("**/auth/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/logout")) return route.fulfill({ status: 204 });
    if (path.endsWith("/user")) return route.fulfill({ json: user });
    const body = route.request().postDataJSON();
    if (body?.email === "invalid@example.test")
      return route.fulfill({
        status: 400,
        headers: {
          "x-supabase-api-version": "2024-01-01",
          "access-control-expose-headers": "x-supabase-api-version",
        },
        json: { code: "invalid_credentials", msg: "Invalid login credentials" },
      });
    if (body?.email === "confirm@example.test")
      return route.fulfill({
        json: { ...user, email: body.email, identities: [] },
      });
    if (body?.data?.full_name)
      user.user_metadata.full_name = body.data.full_name;
    return route.fulfill({
      json: {
        access_token: token,
        refresh_token: "synthetic-refresh-token",
        token_type: "bearer",
        expires_in: 3600,
        user,
      },
    });
  });
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname.slice("/api/v1".length),
      method = request.method();
    const respond = (data: unknown, status = 200, meta?: unknown) =>
      route.fulfill({
        status,
        json: {
          success: status < 400,
          message: status < 400 ? "OK" : "Fixture error",
          data,
          ...(meta ? { meta } : {}),
        },
      });
    const list = (data: unknown[]) => {
      const pageNumber = Number(url.searchParams.get("page") ?? 1),
        size = Number(url.searchParams.get("pageSize") ?? 20);
      return respond(
        data.slice((pageNumber - 1) * size, pageNumber * size),
        200,
        {
          page: pageNumber,
          pageSize: size,
          total: data.length,
          totalPages: Math.ceil(data.length / size),
        },
      );
    };
    if (request.headers().authorization !== `Bearer ${token}`)
      return respond(null, 401);
    const body =
      method === "GET" || method === "DELETE"
        ? undefined
        : request.postDataJSON();
    if (path === "/auth/profile") {
      if (method === "GET") return respond(profile, profile ? 200 : 403);
      const input = profileCreate.parse(body);
      profile = {
        userId,
        email: user.email,
        fullName: input.fullName,
        phone: input.phone ?? null,
        preferredLanguage: input.preferredLanguage,
      };
      return respond(profile);
    }
    if (path === "/categories") return respond(categories);
    if (path === "/transactions") {
      if (method === "GET") return list(transactions);
      const input = transactionCreate.parse(body);
      const item: Transaction = {
        transactionId,
        categoryId: input.categoryId,
        categoryName: input.transactionType === "CASH_IN" ? "Cash In" : "Food",
        transactionType: input.transactionType,
        amount: input.amount,
        merchantName: input.merchantName ?? null,
        description: input.description ?? null,
        transactionDate: input.transactionDate.toISOString(),
        source: input.source,
        createdAt: now(),
      };
      transactions.push(item);
      return respond(item, 201);
    }
    if (path.startsWith("/transactions/")) {
      if (method === "DELETE") {
        transactions = [];
        return respond({ transactionId });
      }
      const input = transactionPatch.parse(body),
        item = transactions[0];
      Object.assign(item, {
        amount: input.amount ?? item.amount,
        description: input.description ?? null,
        merchantName: input.merchantName ?? null,
        transactionDate:
          input.transactionDate?.toISOString() ?? item.transactionDate,
      });
      return respond(item);
    }
    if (path === "/goals") {
      if (method === "GET")
        return list(
          goals.filter(
            (goal) =>
              !url.searchParams.get("status") ||
              goal.status === url.searchParams.get("status"),
          ),
        );
      const input = goalCreate.parse(body);
      const item: Goal = {
        goalId,
        ...input,
        remainingAmount: input.targetAmount - input.currentAmount,
        requiredMonthlySaving: 10,
        status: "ACTIVE",
        progressPercentage: (input.currentAmount / input.targetAmount) * 100,
        isOverdue: false,
        createdAt: now(),
        updatedAt: now(),
      };
      goals.push(item);
      return respond(item, 201);
    }
    if (path === `/goals/${goalId}/contributions`) {
      if (method === "GET") return list(contributions);
      const input = contributionCreate.parse(body);
      goals[0].currentAmount += input.amount;
      goals[0].remainingAmount -= input.amount;
      goals[0].progressPercentage =
        (goals[0].currentAmount / goals[0].targetAmount) * 100;
      const item = {
        contributionId: "synthetic-contribution",
        goalId,
        transactionId: null,
        amount: input.amount,
        contributionDate: now(),
      };
      contributions.push(item);
      return respond({ contribution: item, goal: goals[0] }, 201);
    }
    if (path === `/goals/${goalId}`) {
      if (method === "GET") return respond(goals[0]);
      if (method === "PATCH")
        Object.assign(goals[0], goalPatch.parse(body), { updatedAt: now() });
      else goals[0].status = "CANCELLED";
      return respond(goals[0]);
    }
    if (path === `/goals/${goalId}/savings-plan`)
      return respond({
        ...goals[0],
        averageMonthlyIncome: 1000,
        averageMonthlyExpenses: 0,
        monthlySavingsGap: 0,
        projectedMonthlySaving: 1000,
        remainingMonthlyGap: 0,
        feasibleByTargetDate: true,
        projectedMonthsToGoal: 1,
        categoryBudgets: [],
        notes: ["Isolated browser fixture"],
      });
    if (path === "/dashboard/summary")
      return respond({
        balance: transactions.reduce((sum, item) => sum + item.amount, 0),
        totalIncome: 1000,
        totalExpenses: 0,
        monthlyIncome: 1000,
        monthlyExpenses: 0,
        monthlyNetCashFlow: 1000,
        totalSaved: goals.reduce((sum, goal) => sum + goal.currentAmount, 0),
        goalCount: goals.length,
        goals,
        latestInsights: [],
        recentTransactions: transactions,
      });
    if (path.startsWith("/analytics/")) return respond(spending);
    if (path.startsWith("/financial-health")) {
      if (method === "POST") {
        history.push(health);
        return respond(health, 201);
      }
      return url.searchParams.get("mode") === "history"
        ? list(history)
        : respond(health);
    }
    if (path === "/simulator/what-if") {
      const input = simulationInput.parse(body);
      return respond({
        projectedMonthlySaving: input.monthlySaving,
        requestedMonthlySaving: input.monthlySaving,
        monthlyNetCashFlow: 500,
        monthlyDeficit: 0,
        projectedSavings: 1200,
        horizonMonths: input.horizonMonths,
        goalId: input.goalId ?? null,
        remainingAmount: null,
        monthsToGoal: null,
        projectedGoalDate: null,
        limitations: [],
      });
    }
    if (path === "/affordability/check") {
      affordabilityInput.parse(body);
      return respond({
        purchaseAmount: 100,
        canAfford: false,
        decision: "INSUFFICIENT_DATA",
        recordedCashFlowBalance: 1000,
        reservedGoalSavings: 150,
        emergencyBuffer: 0,
        availableForPurchase: 850,
        balanceAfterPurchase: 900,
        averageMonthlyIncome: 333.33,
        averageMonthlyExpenses: 0,
        monthlyNetCashFlow: 333.33,
        selectedGoalMonthlyRequirement: 0,
        limitations: ["Recorded data only"],
        explanation: null,
      });
    }
    if (path === "/coach/conversations") {
      if (method === "GET") return list(conversations);
      const item = {
        conversationId,
        title: body.title ?? null,
        createdAt: now(),
        updatedAt: now(),
      };
      conversations.push(item);
      return respond(item, 201);
    }
    if (path.endsWith("/messages")) {
      if (method === "GET") return list(messages);
      const input = messageInput.parse(body);
      const userMessage: Message = {
        messageId: "synthetic-user",
        conversationId,
        role: "USER",
        message: input.message,
        createdAt: now(),
      };
      const assistantMessage: Message = {
        messageId: "synthetic-assistant",
        conversationId,
        role: "ASSISTANT",
        message:
          "Review your recorded spending categories before deciding where to reduce expenses.",
        createdAt: now(),
      };
      messages.push(userMessage, assistantMessage);
      recommendations = [
        {
          recommendationId,
          recommendationType: "BUDGET",
          recommendationText: "Review your spending categories.",
          priority: "MEDIUM",
          status: "NEW",
          createdAt: now(),
        },
      ];
      return respond(
        { conversationId, userMessage, assistantMessage, recommendations },
        201,
      );
    }
    if (path.startsWith("/coach/conversations/") && method === "DELETE") {
      conversations = [];
      messages = [];
      return respond({ conversationId });
    }
    if (path === "/recommendations") return list(recommendations);
    if (path.startsWith("/recommendations/")) {
      recommendations[0].status = body.status;
      return respond(recommendations[0]);
    }
    return respond(null, 404);
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.name));
  return { errors };
}
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("demo@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
test("coach retry keeps its request ID after an uncertain send and reload", async ({ page }) => {
  await fixture(page); await login(page);
  await page.getByRole("link", { name: "AI Coach", exact: true }).click();
  await page.getByLabel("Conversation title").fill("Retry test");
  await page.getByRole("button", { name: "New conversation", exact: true }).click();
  const keys: string[] = [];
  await page.route("**/api/v1/coach/conversations/*/messages", async route => {
    if (route.request().method() !== "POST") return route.fallback();
    keys.push(route.request().postDataJSON().requestId);
    if (keys.length === 1) return route.abort("failed");
    return route.fallback();
  });
  await page.getByLabel("Coach language").selectOption("bn");
  await page.getByLabel("Your message").fill("আমার সঞ্চয় নিয়ে পরামর্শ দিন।");
  await page.getByRole("button", { name: "Send to coach", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Cannot connect");
  await page.reload();
  await page.getByRole("button", { name: /Retry test/ }).click();
  await page.getByLabel("Coach language").selectOption("bn");
  await page.getByLabel("Your message").fill("আমার সঞ্চয় নিয়ে পরামর্শ দিন।");
  await page.getByRole("button", { name: "Send to coach", exact: true }).click();
  await expect(page.getByText("Your coach replied.", { exact: true })).toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[1]).toBe(keys[0]);
  expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/i);
});
test("empty records and recoverable backend errors", async ({ page }) => {
  const state = await fixture(page);
  await login(page);
  await expect(
    page.getByText(
      "No transactions yet. Add your recorded income and expenses.",
    ),
  ).toBeVisible();
  await page.route("**/api/v1/transactions?**", (route) =>
    route.fulfill({
      status: 500,
      json: { success: false, message: "Temporarily unavailable", data: null },
    }),
  );
  await page.getByRole("link", { name: "Transactions", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Temporarily unavailable",
  );
  await page.unroute("**/api/v1/transactions?**");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByText(
      "No transactions match. Add a record or adjust your filters.",
    ),
  ).toBeVisible();
  expect(state.errors).toEqual([]);
});
test("protected pages, invalid credentials, and email-confirmation signup", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto("/goals");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email", { exact: true }).fill("invalid@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "email or password is incorrect",
  );
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Demo Member");
  await page.getByLabel("Email", { exact: true }).fill("confirm@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("status").and(page.locator(".notice")),
  ).toContainText("Check your email");
  expect(state.errors).toEqual([]);
});
test("signup, financial workflows, coaching boundaries, and session persistence", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Demo Member");
  await page.getByLabel("Email", { exact: true }).fill("demo@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Hello, Demo" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Transactions", exact: true }).click();
  await page.getByLabel("Category", { exact: true }).selectOption(incomeId);
  await page.getByLabel("Amount (BDT)", { exact: true }).fill("1000");
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await expect(
    page.getByRole("status").and(page.locator(".notice")),
  ).toContainText("Transaction recorded");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Note (optional)").fill("Edited note");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("status").and(page.locator(".notice")),
  ).toContainText("Transaction updated");
  await page.getByRole("link", { name: "Savings goals", exact: true }).click();
  await page.getByLabel("Goal name").fill("Emergency fund");
  await page.getByLabel("Target amount (BDT)").fill("1000");
  await page.getByLabel("Already saved (BDT)").fill("100");
  await page.getByLabel("Target date").fill("2099-01-01");
  await page.getByRole("button", { name: "Create goal", exact: true }).click();
  await expect(
    page.getByRole("status").and(page.locator(".notice")),
  ).toContainText("goal is ready");
  await page.getByRole("link", { name: "Emergency fund", exact: true }).click();
  await page.getByLabel("Contribution amount (BDT)").fill("50");
  await page
    .getByRole("button", { name: "Add contribution", exact: true })
    .click();
  await expect(
    page.getByRole("status").and(page.locator(".notice")),
  ).toContainText("Contribution added");
  await page.getByRole("button", { name: "Pause goal", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume goal" })).toBeVisible();
  await page.getByRole("button", { name: "Resume goal", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause goal" })).toBeVisible();
  await page.getByRole("button", { name: "Calculate savings plan" }).click();
  await expect(
    page.getByText("Savings plan calculated.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Analytics", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Monthly trends" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Refresh & save insight" }).click();
  await expect(
    page.getByRole("status").and(page.locator(".notice")),
  ).toContainText("Spending insight saved");
  await page.getByRole("button", { name: "Save assessment" }).click();
  await expect(
    page.getByRole("status").and(page.locator(".notice")),
  ).toContainText("Wellness assessment saved");
  await page.getByRole("link", { name: "Plan & affordability" }).click();
  await page.getByLabel("Monthly income (BDT)").fill("1000");
  await page.getByLabel("Monthly expenses (BDT)").fill("500");
  await page.getByLabel("Requested monthly saving (BDT)").fill("100");
  await page.getByRole("button", { name: "Run simulation" }).click();
  await expect(
    page.getByRole("region", { name: "Simulation result" }),
  ).toBeVisible();
  await page.getByLabel("Purchase amount (BDT)").fill("100");
  await page.getByRole("button", { name: "Check affordability" }).click();
  await expect(
    page.getByRole("heading", { name: "INSUFFICIENT DATA" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "AI Coach", exact: true }).click();
  await page.getByLabel("Conversation title").fill("My plan");
  await page.getByRole("button", { name: "New conversation" }).click();
  await page.getByLabel("Your message").fill("Help me review my spending.");
  await page.getByRole("button", { name: "Send to coach" }).click();
  await expect(
    page.getByText(
      "Review your recorded spending categories before deciding where to reduce expenses.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Complete", exact: true }).click();
  await expect(page.getByText("COMPLETED", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await page.getByLabel("Full name").fill("Demo Updated");
  await page.getByLabel("Preferred coaching language").selectOption("en");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(
    page.getByRole("status").and(page.locator(".notice")),
  ).toContainText("profile has been saved");
  await page.reload();
  await expect(page.getByLabel("Full name")).toHaveValue("Demo Updated");
  await expect(page.getByLabel("Preferred coaching language")).toHaveValue(
    "en",
  );
  await page.getByRole("link", { name: "AI Coach", exact: true }).click();
  await page.getByRole("button", { name: /My plan/ }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Delete conversation", exact: true })
    .click();
  await expect(
    page.getByText("Conversation deleted.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Delete conversation", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Hello, Demo" }),
  ).toBeVisible();
  expect(state.errors).toEqual([]);
});
