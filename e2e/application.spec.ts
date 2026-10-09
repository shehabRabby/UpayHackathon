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
  Spending,
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
async function fixture(page: Page, longContent = false, presentation = false) {
  // Unmatched external traffic must never reach real Auth/provider services.
  const localOrigin = new URL(String(test.info().project.use.baseURL)).origin;
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === localOrigin
      ? route.fallback()
      : route.abort("blockedbyclient"),
  );
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
  const spending: Spending = {
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
  if (longContent) {
    profile = {
      userId,
      fullName: "Member".repeat(33),
      email: `${"member".repeat(30)}@example.test`,
      phone: null,
      preferredLanguage: "en",
    };
    goals = [
      {
        goalId,
        goalName: "LongGoal".repeat(25),
        targetAmount: 1e12,
        currentAmount: 1e11,
        remainingAmount: 9e11,
        targetDate: "2099-01-01",
        requiredMonthlySaving: 1e9,
        status: "ACTIVE",
        progressPercentage: 10,
        isOverdue: false,
        createdAt: now(),
        updatedAt: now(),
      },
    ];
    transactions = [
      {
        transactionId,
        categoryId: incomeId,
        transactionType: "CASH_IN",
        amount: 1e12,
        merchantName: "Merchant".repeat(25),
        description: "Note".repeat(500),
        transactionDate: now(),
        source: "manual",
        createdAt: now(),
      },
    ];
    conversations = [
      {
        conversationId,
        title: "Conversation".repeat(16),
        createdAt: now(),
        updatedAt: now(),
      },
    ];
    const texts = [
      "Recorded finances BDT 30,000 by 2026-12-31. ".repeat(50),
      "আপনার সঞ্চয়ের পরিকল্পনা recorded BDT 30,000। ".repeat(50),
      "Apnar savings plan e BDT 30,000 save korte hobe. ".repeat(50),
    ];
    messages = texts.map((message, index) => ({
      messageId: `fixture-${index}`,
      conversationId,
      role: "ASSISTANT",
      message,
      createdAt: now(),
    }));
    recommendations = [
      {
        recommendationId,
        recommendationType: "BUDGET",
        recommendationText: texts.join(" "),
        priority: "HIGH",
        status: "VIEWED",
        createdAt: now(),
      },
    ];
    contributions.push({
      contributionId: "fixture-contribution",
      goalId,
      transactionId: null,
      amount: 1e11,
      contributionDate: now(),
    });
    spending.transactionCount = 1;
    spending.categorySpending = [
      {
        categoryId: expenseId,
        categoryName: "Category".repeat(25),
        totalSpent: 1e12,
        transactionCount: 1,
        percentage: 100,
      },
    ];
  }
  if (presentation) {
    profile = {
      userId,
      fullName: "Demo Member",
      email: "demo@example.test",
      phone: null,
      preferredLanguage: "en",
    };
    goals = [
      {
        goalId,
        goalName: "Emergency fund",
        targetAmount: 40000,
        currentAmount: 10000,
        remainingAmount: 30000,
        targetDate: "2099-01-01",
        requiredMonthlySaving: 2500,
        status: "ACTIVE",
        progressPercentage: 25,
        isOverdue: false,
        createdAt: now(),
        updatedAt: now(),
      },
    ];
    transactions = [
      {
        transactionId,
        categoryId: incomeId,
        categoryName: "Cash In",
        transactionType: "CASH_IN",
        amount: 50000,
        merchantName: "Monthly income",
        description: null,
        transactionDate: now(),
        source: "manual",
        createdAt: now(),
      },
    ];
    conversations = [
      {
        conversationId,
        title: "Planning my emergency fund",
        createdAt: now(),
        updatedAt: now(),
      },
    ];
    messages = [
      "Review your recorded spending and choose a monthly saving you can maintain.",
      "আপনার সঞ্চয়ের লক্ষ্য অনুযায়ী একটি বাস্তবসম্মত মাসিক পরিকল্পনা তৈরি করুন।",
      "Apnar emergency fund er jonno protimashe ekta practical savings target set korun.",
    ].map((message, index) => ({
      messageId: `presentation-${index}`,
      conversationId,
      role: "ASSISTANT",
      message,
      createdAt: now(),
    }));
    recommendations = [
      {
        recommendationId,
        recommendationType: "BUDGET",
        recommendationText:
          "Review essential spending before choosing your next savings contribution.",
        priority: "HIGH",
        status: "VIEWED",
        createdAt: now(),
      },
    ];
    spending.totalIncome = 50000;
    spending.totalExpenses = 35000;
    spending.netCashFlow = 15000;
    spending.transactionCount = 4;
    spending.spendingTrends = [
      {
        month: "2026-09",
        totalIncome: 45000,
        totalExpenses: 33000,
        netCashFlow: 12000,
        transactionCount: 3,
      },
      {
        month: "2026-10",
        totalIncome: 50000,
        totalExpenses: 35000,
        netCashFlow: 15000,
        transactionCount: 4,
      },
    ];
    spending.categorySpending = [
      {
        categoryId: expenseId,
        categoryName: "Food & essentials",
        totalSpent: 35000,
        transactionCount: 3,
        percentage: 100,
      },
    ];
    health.healthScore = 62;
  }
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
        balance: presentation
          ? 15000
          : transactions.reduce((sum, item) => sum + item.amount, 0),
        totalIncome: presentation ? 50000 : 1000,
        totalExpenses: presentation ? 35000 : 0,
        monthlyIncome: presentation ? 50000 : 1000,
        monthlyExpenses: presentation ? 35000 : 0,
        monthlyNetCashFlow: presentation ? 15000 : 1000,
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
  page.on("console", (message) => {
    if (
      /hydration|each child.*key|cannot update a component|invalid hook/i.test(
        message.text(),
      )
    )
      errors.push("React runtime warning");
  });
  return { errors };
}

test("create failure preserves input, retry resets it, edits preserve saved values", async ({
  page,
}) => {
  await fixture(page);
  await login(page);
  await page.goto("/transactions");
  await page.getByLabel("Category", { exact: true }).selectOption(incomeId);
  await page.getByLabel("Amount (BDT)", { exact: true }).fill("123.45");
  await page.getByLabel("Note (optional)").fill("Preserve this note");
  await page.route("**/api/v1/transactions", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    return route.fulfill({
      status: 400,
      json: {
        success: false,
        message: "Synthetic validation failure",
        data: null,
      },
    });
  });
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Synthetic validation failure",
  );
  await expect(page.getByLabel("Amount (BDT)", { exact: true })).toHaveValue(
    "123.45",
  );
  await expect(page.getByLabel("Note (optional)")).toHaveValue(
    "Preserve this note",
  );
  await page.unroute("**/api/v1/transactions");
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await expect(
    page.getByText("Transaction recorded.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
  await expect(page.getByLabel("Amount (BDT)", { exact: true })).toHaveValue(
    "",
  );
  await expect(page.getByLabel("Note (optional)")).toHaveValue("");
  await expect(page.getByLabel("Date", { exact: true })).not.toHaveValue("");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Note (optional)").fill("  Persisted note  ");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByText("Transaction updated.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Note (optional)")).toHaveValue(
    "Persisted note",
  );
  await page.getByLabel("Amount (BDT)", { exact: true }).fill("0");
  await expect(
    page.getByText("Transaction updated.", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByLabel("Amount (BDT)", { exact: true })).toHaveValue(
    "0",
  );
  expect(
    await page
      .getByLabel("Amount (BDT)", { exact: true })
      .evaluate((input: HTMLInputElement) => input.validity.valid),
  ).toBe(false);
});

test("calculator edits and invalid inputs clear stale results without erasing scenarios", async ({
  page,
}) => {
  await fixture(page);
  await login(page);
  await page.goto("/planning");
  await page.getByLabel("Monthly income (BDT)").fill("50000");
  await page.getByLabel("Monthly expenses (BDT)").fill("5000");
  await page.getByLabel("Requested monthly saving (BDT)").fill("10000");
  await page.getByRole("button", { name: "Run simulation" }).click();
  await expect(
    page.getByRole("region", { name: "Simulation result" }),
  ).toBeVisible();
  await expect(page.getByLabel("Monthly income (BDT)")).toHaveValue("50000");
  await page.getByLabel("Monthly income (BDT)").fill("-50000");
  await expect(
    page.getByRole("region", { name: "Simulation result" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Your scenario is calculated. No records were changed.", {
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Run simulation" }).click();
  await expect(
    page.getByRole("region", { name: "Simulation result" }),
  ).toHaveCount(0);
  await page.getByLabel("Monthly income (BDT)").fill("50000");
  await page.getByRole("button", { name: "Run simulation" }).click();
  await expect(
    page.getByRole("region", { name: "Simulation result" }),
  ).toBeVisible();
  await page.getByLabel("Horizon (months)").fill("0");
  await expect(
    page.getByRole("region", { name: "Simulation result" }),
  ).toHaveCount(0);
  await page.getByLabel("Purchase amount (BDT)").fill("100");
  await page.getByRole("button", { name: "Check affordability" }).click();
  await expect(
    page.getByRole("region", { name: "Affordability result" }),
  ).toBeVisible();
  await page.getByLabel("Emergency buffer (months)").fill("13");
  await expect(
    page.getByRole("region", { name: "Affordability result" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Your purchase assessment is ready.", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Check affordability" }).click();
  await expect(
    page.getByRole("region", { name: "Affordability result" }),
  ).toHaveCount(0);
});

test("switching conversations clears another conversation's draft and error", async ({
  page,
}) => {
  await fixture(page);
  const secondId = "00000000-0000-4000-8000-000000000008";
  await page.route("**/api/v1/coach/conversations?**", (route) =>
    route.fulfill({
      json: {
        success: true,
        message: "OK",
        data: [
          {
            conversationId,
            title: "First fixture conversation",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            conversationId: secondId,
            title: "Second fixture conversation",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
    }),
  );
  await page.route("**/api/v1/coach/conversations/*/messages", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    return route.fulfill({
      status: 500,
      json: { success: false, message: "Synthetic coach failure", data: null },
    });
  });
  await login(page);
  await page.goto("/coach");
  await openConversations(page);
  await page
    .getByRole("button", { name: /First fixture conversation/ })
    .click();
  await page.getByLabel("Your message").fill("Keep this failed draft");
  await page
    .getByRole("button", { name: "Send to coach", exact: true })
    .click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Synthetic coach failure",
  );
  await expect(page.getByLabel("Your message")).toHaveValue(
    "Keep this failed draft",
  );
  await openConversations(page);
  await page
    .getByRole("button", { name: /Second fixture conversation/ })
    .click();
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
  await expect(page.getByLabel("Your message")).toHaveValue("");
});

test("a delayed action does not restore a success banner after its inputs change", async ({
  page,
}) => {
  await fixture(page);
  await login(page);
  await page.goto("/analytics");
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/analytics/refresh", async (route) => {
    await gate;
    return route.fallback();
  });
  const save = page.getByRole("button", { name: "Refresh & save insight" });
  await save.click();
  await expect(save).toBeDisabled();
  await page.getByLabel("Start date").fill("2020-02-01");
  release();
  await expect(save).toBeEnabled();
  await expect(
    page.getByText("Spending insight saved to your dashboard.", {
      exact: true,
    }),
  ).toHaveCount(0);
});

for (const width of [320, 375, 390, 768, 1024, 1280, 1440]) {
  test(`responsive public and workspace pages at ${width}px with long multilingual fixtures`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    const state = await fixture(page, true);
    const check = async (path: string) => {
      await page.goto(path);
      await expect(
        path === "/missing-page"
          ? page.getByRole("heading", { name: "Page not found", exact: true })
          : page.locator("main"),
      ).toBeVisible();
      await expect(page.locator(".loading")).toHaveCount(0);
      for (const amount of await page
        .locator(".metric .currency-value")
        .all()) {
        const fits = await amount.evaluate((element) => {
          const rect = element.getBoundingClientRect(),
            card = element.closest(".metric")!.getBoundingClientRect();
          return (
            rect.right <= card.right &&
            rect.height <= parseFloat(getComputedStyle(element).lineHeight) + 1
          );
        });
        expect(
          fits,
          `${path}: currency amount must fit without splitting its digits`,
        ).toBe(true);
      }
      const overflow = await page.evaluate(() => ({
        width: innerWidth,
        document: document.documentElement.scrollWidth,
        elements: [...document.querySelectorAll("body *")]
          .filter((element) => {
            const bounds = element.getBoundingClientRect();
            return (
              bounds.width > 0 &&
              bounds.right > innerWidth + 1 &&
              !element.closest(".table-wrap,.messages,.conversation-list")
            );
          })
          .map((element) => element.className || element.tagName)
          .slice(0, 8),
      }));
      expect(
        overflow.document,
        `${path}: ${JSON.stringify(overflow)}`,
      ).toBeLessThanOrEqual(width);
    };
    for (const path of [
      "/",
      "/about",
      "/features",
      "/how-it-works",
      "/security",
      "/login",
      "/signup",
      "/missing-page",
    ])
      await check(path);
    await page.goto("/auth/callback");
    await expect(page).toHaveURL(/\/login\?confirmation=failed$/);
    await login(page);
    for (const path of [
      "/dashboard",
      "/transactions",
      "/goals",
      `/goals/${goalId}`,
      "/analytics",
      "/planning",
      "/profile",
      "/coach",
    ])
      await check(path);
    await openConversations(page);
    await page
      .getByRole("button", { name: /ConversationConversation/ })
      .click();
    await expect(page.locator("article.message")).toHaveCount(3);
    await expect(page.locator("article.message").nth(1)).toContainText("আপনার");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    const chatOverflow = await page
      .locator(".messages")
      .evaluate((element) => element.scrollWidth > element.clientWidth);
    expect(chatOverflow).toBe(false);
    await expect(
      page.getByRole("button", { name: "Delete conversation", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Coach language")).toBeVisible();
    expect(state.errors).toEqual([]);
    // Deliberately malformed synthetic data exercises the existing error
    // boundary without throwing against real records or exposing error details.
    await page.route("**/api/v1/dashboard/summary", (route) =>
      route.fulfill({
        json: {
          success: true,
          message: "Synthetic boundary fixture",
          data: { goals: null },
        },
      }),
    );
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Something went wrong", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Try again", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.unroute("**/api/v1/dashboard/summary");
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(page.getByRole("heading", { name: /^Hello,/ })).toBeVisible();
  });
}
async function login(page: Page) {
  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("demo@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
test("Analytics charts preserve values, keyboard tooltips and layout at seven widths", async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const state = await fixture(page, false, true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page);
  await page.goto("/analytics");
  await expect(page.locator(".analytics-categories")).toContainText("100%");
  await expect(page.getByRole("meter", { name: "Overall recorded financial wellness" })).toHaveAttribute("aria-valuenow", "62");
  await expect(page.locator(".analytics-score-components")).toContainText("0 / 100");
  await expect(page.locator(".analytics-comparisons")).toContainText("Not comparable");
  const bdt = (value: number) => new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 2 }).format(value);
  let direction: "ArrowRight" | "ArrowLeft" = "ArrowRight";
  for (const width of [320, 375, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const chart = page.locator(".analytics-chart-canvas .recharts-surface");
    await expect(chart).toBeVisible();
    // Wait for ResizeObserver to settle at this width before checking the SVG.
    await expect.poll(async () => chart.evaluate(element => {
      const canvas = element.closest(".analytics-chart-canvas")!.getBoundingClientRect();
      const svg = element.getBoundingClientRect();
      return Math.abs(svg.width - canvas.width) < 2 && svg.height >= 250;
    })).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (width <= 600) expect(await page.locator(".analytics-dashboard .table-wrap").first().evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    for (const value of await page.locator(".analytics-meter-value,.analytics-ring-label").all()) {
      expect(await value.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        return element.scrollWidth <= element.clientWidth + 1 && bounds.left >= 0 && bounds.right <= innerWidth;
      })).toBe(true);
    }
    await expect(page.locator(".analytics-chart-key")).toContainText("Income");
    await expect(page.locator(".analytics-chart-key")).toContainText("Expenses");
    await chart.focus();
    await chart.press(direction);
    direction = direction === "ArrowRight" ? "ArrowLeft" : "ArrowRight";
    const tooltip = page.locator(".analytics-tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveAttribute("role", "status");
    await expect(tooltip).toHaveAttribute("aria-live", "assertive");
    await expect(tooltip).toHaveAttribute("aria-atomic", "true");
    await expect(page.locator('.analytics-chart-canvas [aria-live]')).toHaveCount(1);
    await expect(tooltip).toContainText("Income");
    await expect(tooltip).toContainText("Expenses");
    await expect(tooltip).toContainText("Net cash flow");
    const september = (await tooltip.textContent())!.includes("Sep");
    for (const value of september ? [45000, 33000, 12000] : [50000, 35000, 15000]) await expect(tooltip).toContainText(bdt(value));
    const bounds = (await tooltip.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    if ([320, 390, 1440].includes(width)) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: testInfo.outputPath(`analytics-polish-${width}.png`), fullPage: true, scale: "css" });
    }
    await page.getByRole("heading", { name: "Monthly trends" }).click();
  }
  await page.getByLabel("Start date").fill("2026-09-01");
  await page.getByLabel("End date").fill("2026-10-02");
  const filtered = page.waitForRequest(request => request.url().includes("/analytics/spending?") && request.method() === "GET");
  await page.getByRole("button", { name: "Apply period" }).click();
  const url = new URL((await filtered).url());
  expect(url.searchParams.get("startDate")).toBe("2026-09-01");
  expect(url.searchParams.get("endDate")).toBe("2026-10-02");
  await expect(page.locator(".loading")).toHaveCount(0);
  await expect(page.getByRole("meter", { name: "Overall recorded financial wellness" })).toHaveAttribute("aria-valuenow", "62");
  // The maximum supported custom range can span 13 calendar months. Exercise
  // that dense chart and long returned labels using synthetic API data only.
  const longPeriod: Spending = {
    period: { startDate: "2025-10-02", endDate: "2026-10-02", days: 366, timeZone: "Asia/Dhaka" },
    totalIncome: 130000, totalExpenses: 117000, netCashFlow: 13000, transactionCount: 26,
    categorySpending: [{ categoryId: "long-fixture", categoryName: "Long category name ".repeat(12), totalSpent: 117000, transactionCount: 13, percentage: 100 }],
    spendingTrends: Array.from({ length: 13 }, (_, index) => ({
      month: new Date(Date.UTC(2025, 9 + index, 1)).toISOString().slice(0, 7),
      totalIncome: 10000, totalExpenses: 9000, netCashFlow: 1000, transactionCount: 2,
    })),
    comparison: { incomeChangePercent: 0, expenseChangePercent: null }, calculationVersion: "spending-v1",
  };
  await page.route("**/api/v1/analytics/spending**", route => route.fulfill({ json: { success: true, message: "OK", data: longPeriod } }));
  await page.goto("/analytics");
  await expect(page.locator(".analytics-category-heading h3")).toHaveText(longPeriod.categorySpending[0].categoryName.trim());
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const chart = page.locator(".analytics-chart-canvas .recharts-surface");
    await expect.poll(async () => chart.evaluate(element => Math.abs(element.getBoundingClientRect().width - element.closest(".analytics-chart-canvas")!.getBoundingClientRect().width))).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const labels = await page.locator(".recharts-xAxis .recharts-cartesian-axis-tick").evaluateAll(elements => elements.map(element => {
      const bounds = element.getBoundingClientRect();
      return { left: bounds.left, right: bounds.right };
    }));
    expect(labels.length).toBeGreaterThanOrEqual(2);
    for (let index = 1; index < labels.length; index++) expect(labels[index].left).toBeGreaterThanOrEqual(labels[index - 1].right);
    const bar = page.locator(".analytics-chart-canvas .recharts-bar-rectangle").first();
    await bar.hover();
    await expect(page.locator(".analytics-tooltip")).toContainText(bdt(10000));
    await expect(page.locator(".analytics-tooltip")).toContainText(bdt(9000));
    await expect(page.locator(".analytics-tooltip")).toContainText(bdt(1000));
    const bounds = (await page.locator(".analytics-tooltip").boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.getByRole("button", { name: "Save assessment", exact: true }).click();
  const saved = page.getByRole("table", { name: "Saved illustrative scores out of 100" });
  await expect(saved.getByRole("cell", { name: /62/ })).toBeVisible();
  expect(await saved.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  expect(state.errors).toEqual([]);
});

test("Analytics preserves loading, failure, retry, empty data and unbounded changes", async ({ page }) => {
  const state = await fixture(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let attempts = 0;
  let fail = true;
  const data: Spending = {
    period: { startDate: "2026-07-05", endDate: "2026-10-02", days: 90, timeZone: "Asia/Dhaka" },
    totalIncome: 0, totalExpenses: 0, netCashFlow: 0, transactionCount: 0,
    categorySpending: [], spendingTrends: [],
    comparison: { incomeChangePercent: 245.67, expenseChangePercent: -50.25 }, calculationVersion: "spending-v1",
  };
  await page.route("**/api/v1/analytics/spending**", async route => {
    attempts++;
    if (fail) {
      await gate;
      return route.fulfill({ status: 500, json: { success: false, message: "Synthetic analytics failure", data: null } });
    }
    return route.fulfill({ json: { success: true, message: "OK", data } });
  });
  await login(page);
  await page.goto("/analytics");
  const controls = page.locator(".analytics-controls");
  await expect(controls.getByRole("status")).toContainText("Loading");
  await expect(page.locator(".analytics-chart-canvas")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Refresh & save insight" })).toBeDisabled();
  release();
  await expect(controls.getByRole("alert")).toContainText("Synthetic analytics failure");
  await expect(page.locator(".analytics-chart-canvas")).toHaveCount(0);
  fail = false;
  await controls.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText("No recorded transactions in this period.", { exact: true })).toBeVisible();
  await expect(page.getByText(/No category spending in this period/)).toBeVisible();
  await expect(page.locator(".analytics-chart-canvas")).toHaveCount(0);
  await expect(page.locator(".analytics-comparisons")).toContainText("+245.67%");
  await expect(page.locator(".analytics-comparisons")).toContainText("-50.25%");
  await expect(page.locator(".analytics-comparisons progress")).toHaveCount(0);
  await expect(page.getByText("Save an assessment to start your history.", { exact: true })).toBeVisible();
  expect(attempts).toBeGreaterThanOrEqual(2);
  expect(state.errors).toEqual([]);
});

test("recommendation actions follow terminal-state rules", async ({ page }) => {
  await fixture(page);
  const items = ["NEW", "VIEWED", "COMPLETED", "DISMISSED"].map(
    (status, index) => ({
      recommendationId: `synthetic-${index}`,
      recommendationType: "BUDGET",
      priority: "LOW",
      status,
      recommendationText: `Synthetic recommendation ${index}`,
      createdAt: new Date().toISOString(),
    }),
  );
  await page.route("**/api/v1/recommendations**", async (route) => {
    const request = route.request();
    if (request.method() === "PATCH") {
      const item = items.find((value) =>
        request.url().endsWith(value.recommendationId),
      )!;
      item.status = request.postDataJSON().status;
      return route.fulfill({
        json: { success: true, message: "Updated", data: item },
      });
    }
    return route.fulfill({
      json: { success: true, message: "OK", data: items },
    });
  });
  await login(page);
  const article = (index: number) =>
    page
      .locator("article.recommendation")
      .filter({ hasText: `Synthetic recommendation ${index}` });
  for (const [index, count] of [
    [0, 3],
    [1, 2],
    [2, 0],
    [3, 0],
  ]) {
    await expect(article(index)).toBeVisible();
    await expect(article(index).getByRole("button")).toHaveCount(count);
    await expect(article(index)).toContainText(items[index].status);
  }
  await expect(
    article(1).getByRole("button", { name: "Mark read" }),
  ).toHaveCount(0);
  await article(0).getByRole("button", { name: "Mark read" }).click();
  await expect(article(0)).toContainText("VIEWED");
  await expect(article(0).getByRole("button")).toHaveCount(2);
  await article(0)
    .getByRole("button", { name: "Complete", exact: true })
    .click();
  await expect(article(0)).toContainText("COMPLETED");
  await expect(article(0).getByRole("button")).toHaveCount(0);
  await article(1)
    .getByRole("button", { name: "Dismiss", exact: true })
    .click();
  await expect(article(1)).toContainText("DISMISSED");
  await expect(article(1).getByRole("button")).toHaveCount(0);
});
test("coach retry keeps its request ID after an uncertain send and reload", async ({
  page,
}) => {
  await fixture(page);
  await login(page);
  await navigate(page, "AI Coach");
  await page.getByLabel("Conversation title").fill("Retry test");
  await page
    .getByRole("button", { name: "New conversation", exact: true })
    .click();
  const keys: string[] = [];
  await page.route(
    "**/api/v1/coach/conversations/*/messages",
    async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      keys.push(route.request().postDataJSON().requestId);
      if (keys.length === 1) return route.abort("failed");
      return route.fallback();
    },
  );
  await page.getByLabel("Coach language").selectOption("bn");
  await page.getByLabel("Your message").fill("আমার সঞ্চয় নিয়ে পরামর্শ দিন।");
  await page
    .getByRole("button", { name: "Send to coach", exact: true })
    .click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Cannot connect",
  );
  await page.reload();
  await openConversations(page);
  await page.getByRole("button", { name: /Retry test/ }).click();
  await page.getByLabel("Coach language").selectOption("bn");
  await page.getByLabel("Your message").fill("আমার সঞ্চয় নিয়ে পরামর্শ দিন।");
  await page
    .getByRole("button", { name: "Send to coach", exact: true })
    .click();
  await expect(
    page.getByText("Your coach replied.", { exact: true }),
  ).toBeVisible();
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
  let releaseFailure!: () => void;
  const pendingFailure = new Promise<void>((resolve) => { releaseFailure = resolve; });
  await page.route("**/api/v1/transactions?**", async (route) => {
    await pendingFailure;
    return route.fulfill({
      status: 500,
      json: { success: false, message: "Temporarily unavailable", data: null },
    });
  });
  await navigate(page, "Transactions");
  const history = page.locator(".history-panel");
  try {
    await expect(history.getByRole("status")).toContainText("Loading your data");
    await expect(history.locator("table, .empty")).toHaveCount(0);
  } finally {
    releaseFailure();
  }
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Temporarily unavailable",
  );
  await expect(history.locator(".loading")).toHaveCount(0);
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
  await page
    .getByLabel("Email address", { exact: true })
    .fill("invalid@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "email or password is incorrect",
  );
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Demo Member");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("confirm@example.test");
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
  await page
    .getByLabel("Email address", { exact: true })
    .fill("demo@example.test");
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
  await navigate(page, "Transactions");
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
  await expect(page.getByLabel("Note (optional)")).toHaveValue("Edited note");
  await expect(page.getByLabel("Amount (BDT)", { exact: true })).toHaveValue(
    "1000",
  );
  await navigate(page, "Savings goals");
  await page.getByLabel("Goal name").fill("Emergency fund");
  await page.getByLabel("Target amount (BDT)").fill("1000");
  await page.getByLabel("Already saved (BDT)").fill("100");
  await page.getByLabel("Target date").fill("2099-01-01");
  await page.getByRole("button", { name: "Create goal", exact: true }).click();
  await expect(
    page.getByRole("status").and(page.locator(".notice")),
  ).toContainText("goal is ready");
  await expect(page.getByLabel("Goal name")).toHaveValue("");
  await expect(page.getByLabel("Already saved (BDT)")).toHaveValue("0");
  await page.getByRole("link", { name: "Emergency fund", exact: true }).click();
  await page.getByLabel("Contribution amount (BDT)").fill("50");
  await page
    .getByRole("button", { name: "Add contribution", exact: true })
    .click();
  await expect(
    page.getByRole("status").and(page.locator(".notice")),
  ).toContainText("Contribution added");
  await expect(page.getByLabel("Contribution amount (BDT)")).toHaveValue("");
  await page.getByRole("button", { name: "Pause goal", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume goal" })).toBeVisible();
  await page.getByRole("button", { name: "Resume goal", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause goal" })).toBeVisible();
  await page.getByRole("button", { name: "Calculate savings plan" }).click();
  await expect(
    page.getByText("Savings plan calculated.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Spending reduction (%)").fill("51");
  await expect(
    page.getByText("Savings plan calculated.", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Projected monthly saving", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Calculate savings plan" }).click();
  await expect(
    page.getByText("Projected monthly saving", { exact: true }),
  ).toHaveCount(0);
  await navigate(page, "Analytics");
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
  await navigate(page, "Plan & affordability");
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
  await navigate(page, "AI Coach");
  await page.getByLabel("Conversation title").fill("My plan");
  await page.getByRole("button", { name: "New conversation" }).click();
  await expect(page.getByLabel("Conversation title")).toHaveValue("");
  await page.getByLabel("Your message").fill("Help me review my spending.");
  await page.getByRole("button", { name: "Send to coach" }).click();
  await expect(
    page.getByText(
      "Review your recorded spending categories before deciding where to reduce expenses.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Complete", exact: true }).click();
  await expect(page.getByText("COMPLETED", { exact: true })).toBeVisible();
  await navigate(page, "Profile");
  await page.getByLabel("Full name").fill("  Demo Updated  ");
  await page.getByLabel("Preferred coaching language").selectOption("en");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(
    page.getByRole("status").and(page.locator(".notice")),
  ).toContainText("profile has been saved");
  await expect(page.getByLabel("Full name")).toHaveValue("Demo Updated");
  await page.reload();
  await expect(page.getByLabel("Full name")).toHaveValue("Demo Updated");
  await expect(page.getByLabel("Preferred coaching language")).toHaveValue(
    "en",
  );
  await navigate(page, "AI Coach");
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
  await openAppMenu(page);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Hello, Demo" }),
  ).toBeVisible();
  expect(state.errors).toEqual([]);
});

async function openAppMenu(page: Page) {
  await expect(page.locator(".sidebar")).toBeVisible();
  const toggle = page
    .locator(".sidebar")
    .getByRole("button", { name: "Menu", exact: true });
  if (
    (await toggle.isVisible()) &&
    (await toggle.getAttribute("aria-expanded")) !== "true"
  )
    await toggle.click();
}
async function openConversations(page: Page) {
  await expect(page.locator(".conversation-panel")).toBeVisible();
  const toggle = page.getByRole("button", {
    name: "Conversations",
    exact: true,
  });
  if (
    (await toggle.isVisible()) &&
    (await toggle.getAttribute("aria-expanded")) !== "true"
  )
    await toggle.click();
}
async function navigate(page: Page, name: string) {
  await openAppMenu(page);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name, exact: true })
    .click();
  if (name === "AI Coach") await openConversations(page);
}
async function openPublicMenu(page: Page) {
  const toggle = page
    .locator(".public-header")
    .getByRole("button", { name: "Menu", exact: true });
  if (
    (await toggle.isVisible()) &&
    (await toggle.getAttribute("aria-expanded")) !== "true"
  )
    await toggle.click();
}

test("public pages use static demos and signed-out navigation with working CTAs", async ({
  page,
}) => {
  const state = await fixture(page);
  const financialRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/"))
      financialRequests.push(new URL(request.url()).pathname);
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Plan your savings/, level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByText("Illustrative demo", { exact: true }).first(),
  ).toBeVisible();
  await openPublicMenu(page);
  const header = page.locator(".public-header");
  await expect(
    header.getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(
    header.getByRole("link", { name: "Get started", exact: true }),
  ).toHaveAttribute("href", "/signup");
  await expect(
    header.getByRole("button", { name: "Sign out", exact: true }),
  ).toHaveCount(0);
  await header.getByRole("link", { name: "About", exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(
    page.getByRole("heading", { name: /A savings goal/, level: 1 }),
  ).toBeVisible();
  await expect(page.locator("main")).toContainText(
    "no live Upay wallet connection",
  );
  expect(financialRequests).toEqual([]);
  await page
    .locator("main")
    .getByRole("link", { name: "Explore what the product can do", exact: true })
    .click();
  await expect(page).toHaveURL(/\/features$/);
  await openPublicMenu(page);
  await header.getByRole("link", { name: "Get started", exact: true }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await page
    .locator("main")
    .getByRole("link", { name: "Sign in", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await page
    .locator("main")
    .getByRole("link", { name: "Create an account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/signup$/);
  expect(state.errors).toEqual([]);
});

test("public navigation and home CTAs follow the existing authenticated session and logout", async ({
  page,
}) => {
  const state = await fixture(page);
  await login(page);
  await page.goto("/");
  await expect(
    page
      .locator("main")
      .getByRole("link", { name: "Go to dashboard", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator("main")
      .getByRole("link", { name: "Get started", exact: true }),
  ).toHaveCount(0);
  await openPublicMenu(page);
  const header = page.locator(".public-header");
  await expect(
    header.getByRole("link", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(
    header.getByRole("link", { name: "Sign in", exact: true }),
  ).toHaveCount(0);
  await expect(
    header.getByRole("link", { name: "Get started", exact: true }),
  ).toHaveCount(0);
  await header.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page
      .locator("main")
      .getByRole("link", { name: "Get started", exact: true }),
  ).toBeVisible();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  expect(state.errors).toEqual([]);
});

test("mobile disclosures support keyboard escape, active routes and reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await page.goto("/");
  const publicToggle = page
    .locator(".public-header")
    .getByRole("button", { name: "Menu", exact: true });
  await expect(publicToggle).toHaveAttribute("aria-expanded", "false");
  await publicToggle.focus();
  await page.keyboard.press("Enter");
  await expect(publicToggle).toHaveAttribute("aria-expanded", "true");
  await page
    .locator(".public-header")
    .getByRole("link", { name: "About", exact: true })
    .focus();
  await page.keyboard.press("Escape");
  await expect(publicToggle).toBeFocused();
  await expect(publicToggle).toHaveAttribute("aria-expanded", "false");
  await login(page);
  const appToggle = page
    .locator(".sidebar")
    .getByRole("button", { name: "Menu", exact: true });
  await expect(appToggle).toHaveAttribute("aria-expanded", "false");
  await appToggle.focus();
  await page.keyboard.press("Enter");
  const dashboard = page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Dashboard", exact: true });
  await expect(dashboard).toHaveAttribute("aria-current", "page");
  await dashboard.focus();
  await page.keyboard.press("Escape");
  await expect(appToggle).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await appToggle.evaluate(
      (element) => getComputedStyle(element).transitionDuration,
    ),
  ).toBe("0s");
  expect(
    await appToggle.evaluate(
      (element) => getComputedStyle(element).outlineStyle,
    ),
  ).toBe("solid");
});

test("coach topic suggestions prepare a draft without generating or sending messages", async ({
  page,
}) => {
  const state = await fixture(page);
  await login(page);
  await page.goto("/coach");
  const sends: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname.endsWith("/messages")
    )
      sends.push(request.url());
  });
  await page
    .getByRole("button", {
      name: "Help me plan my emergency fund",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Conversation title")).toBeVisible();
  await page.getByLabel("Conversation title").fill("Suggested topic");
  await page
    .getByRole("button", { name: "New conversation", exact: true })
    .click();
  await expect(page.getByLabel("Your message")).toHaveValue(
    "Help me plan my emergency fund",
  );
  expect(sends).toEqual([]);
  expect(state.errors).toEqual([]);
});

test("visual review captures static public, auth and synthetic workspace screens", async ({
  page,
}, testInfo) => {
  const state = await fixture(page, true);
  await page.goto("/");
  await expect(
    page
      .locator("main")
      .getByRole("link", { name: "Get started", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("home.png"),
    fullPage: true,
    scale: "css",
  });
  await page.goto("/login");
  await page.screenshot({
    path: testInfo.outputPath("login.png"),
    fullPage: true,
    scale: "css",
  });
  await page.goto("/signup");
  await page.screenshot({
    path: testInfo.outputPath("signup.png"),
    fullPage: true,
    scale: "css",
  });
  await page.goto("/about");
  await page.screenshot({
    path: testInfo.outputPath("about.png"),
    fullPage: true,
    scale: "css",
  });
  await login(page);
  await expect(page.getByRole("heading", { name: /^Hello,/ })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("dashboard.png"),
    fullPage: true,
    scale: "css",
  });
  for (const [path, name] of [
    ["/transactions", "transactions"],
    ["/goals", "goals"],
    [`/goals/${goalId}`, "goal-detail"],
    ["/analytics", "analytics"],
    ["/planning", "planning"],
    ["/profile", "profile"],
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator(".loading")).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath(`${name}.png`),
      fullPage: true,
      scale: "css",
    });
  }
  await page.goto("/coach");
  await expect(
    page.getByRole("heading", {
      name: "What would you like to understand about your money?",
    }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("coach-empty.png"),
    fullPage: true,
    scale: "css",
  });
  await openConversations(page);
  await page.getByRole("button", { name: /ConversationConversation/ }).click();
  await expect(page.locator("article.message")).toHaveCount(3);
  await page.screenshot({
    path: testInfo.outputPath("coach.png"),
    fullPage: true,
    scale: "css",
  });
  expect(state.errors).toEqual([]);
});

test("standalone public routes support active navigation, refresh and browser history", async ({
  page,
}) => {
  const state = await fixture(page);
  const financialRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/"))
      financialRequests.push(request.url());
  });
  await page.goto("/");
  for (const [name, path, heading] of [
    ["Features", "/features", "Plan a savings goal. Assess a purchase."],
    [
      "How it works",
      "/how-it-works",
      "Plan the saving pace. Check the purchase fit.",
    ],
    ["Security", "/security", "Your financial records belong to you."],
  ]) {
    await openPublicMenu(page);
    await page
      .getByRole("navigation", { name: "Public navigation" })
      .getByRole("link", { name, exact: true })
      .click();
    await expect(page).toHaveURL(path);
    await expect(
      page.getByRole("heading", { name: heading, level: 1 }),
    ).toBeVisible();
    await page.reload();
    await openPublicMenu(page);
    await expect(
      page
        .getByRole("navigation", { name: "Public navigation" })
        .getByRole("link", { name, exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page
        .getByRole("navigation", { name: "Footer navigation" })
        .getByRole("link", { name, exact: true }),
    ).toHaveAttribute("href", path);
  }
  await page.goBack();
  await expect(page).toHaveURL("/how-it-works");
  await page.goForward();
  await expect(page).toHaveURL("/security");
  expect(financialRequests).toEqual([]);
  expect(state.errors).toEqual([]);
});

test("public route clicks start at the top and history restores the previous position", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/");
  for (const [label, path] of [
    ["About", "/about"],
    ["Features", "/features"],
    ["How it works", "/how-it-works"],
    ["Security", "/security"],
    ["Home", "/"],
  ]) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await openPublicMenu(page);
    await page
      .getByRole("navigation", { name: "Public navigation" })
      .getByRole("link", { name: label, exact: true })
      .click();
    await expect(page).toHaveURL(path);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  }
  for (const [label, path] of [
    ["About", "/about"],
    ["Features", "/features"],
    ["How it works", "/how-it-works"],
    ["Security", "/security"],
  ]) {
    await page
      .getByRole("navigation", { name: "Footer navigation" })
      .getByRole("link", { name: label, exact: true })
      .click();
    await expect(page).toHaveURL(path);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  }
  await page.goto("/about");
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(600);
  await page
    .getByRole("link", { name: "Explore what the product can do" })
    .click();
  await expect(page).toHaveURL("/features");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.goBack();
  await expect(page).toHaveURL("/about");
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
  await page.goForward();
  await expect(page).toHaveURL("/features");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  for (const [label, path] of [
    ["Sign in", "/login"],
    ["Get started", "/signup"],
  ]) {
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
    );
    await openPublicMenu(page);
    await page
      .locator(".public-header")
      .getByRole("link", { name: label, exact: true })
      .click();
    await expect(page).toHaveURL(path);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  }
  await page.goto("/features");
  await page
    .locator(".catalog-index")
    .getByRole("link", { name: /Savings goals/i })
    .click();
  await expect(page).toHaveURL(/#goals$/);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
});

test("original hero and reduced-motion presentation preserve visible content", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Promotional image carousel" }),
  ).toBeVisible();
  await expect(page.getByText("Promotional image to be supplied")).toHaveCount(
    0,
  );
  await expect
    .poll(() =>
      page
        .locator(".hero-slider")
        .evaluate((node) => getComputedStyle(node).animationName),
    )
    .toBe("none");
  await page.goto("/features");
  await expect(page.locator("[data-feature]")).toHaveCount(8);
  await expect(page.locator("[data-feature]").last()).toBeVisible();
  expect(state.errors).toEqual([]);
});

test("workspace summaries and form hints use recorded data without changing fields", async ({
  page,
}) => {
  await fixture(page, false, true);
  await login(page);
  await page.goto("/transactions");
  await expect(page.locator(".workspace-metrics")).toContainText("50,000");
  await expect(page.locator(".workspace-metrics")).toContainText("35,000");
  await expect(page.locator(".workspace-metrics")).toContainText("15,000");
  await expect(
    page.getByLabel("Amount (BDT)", { exact: true }),
  ).toHaveAttribute("placeholder", "Enter amount in BDT");
  await expect(page.getByLabel("Note (optional)")).toHaveAttribute(
    "placeholder",
    "Add an optional note",
  );
  await page.goto("/goals");
  await expect(page.locator(".summary-scope")).toContainText("Current page 1");
  await expect(page.locator(".workspace-metrics")).toContainText("25%");
  await expect(page.getByLabel("Goal name", { exact: true })).toHaveAttribute(
    "placeholder",
    "e.g. Laptop Fund",
  );
  await page.goto("/planning");
  await expect(page.getByLabel("Monthly income (BDT)")).toHaveAttribute(
    "placeholder",
    "Enter monthly income",
  );
  await expect(page.getByLabel("Purchase amount (BDT)")).toHaveAttribute(
    "placeholder",
    "Enter purchase amount",
  );
});

test("public pages have distinct useful content and no private financial requests", async ({
  page,
}) => {
  await fixture(page);
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/")) requests.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator("[data-public-section]")).toHaveCount(8);
  await expect(page.locator(".capability-strip")).toContainText(
    "2Core decisions",
  );
  await expect(
    page
      .locator(".home-hero")
      .getByRole("link", { name: "Explore features", exact: true }),
  ).toHaveAttribute("href", "/features");
  await page.goto("/about");
  await expect(page.locator("[data-public-section]")).toHaveCount(8);
  await expect(page.locator("#validation-framework")).toContainText(
    "Proposed validation metrics",
  );
  await expect(page.locator(".ecosystem")).toContainText(
    "Recorded financial activity",
  );
  await page.goto("/features");
  await expect(page.locator("[data-feature]")).toHaveCount(8);
  await expect(page.locator("[data-feature=goals]")).toContainText(
    "pause/resume",
  );
  await expect(page.locator("[data-feature=affordability]")).toContainText(
    "emergency-buffer",
  );
  await page.goto("/how-it-works");
  await expect(page.locator("[data-workflow-step]")).toHaveCount(9);
  await expect(page.locator(".workflow-loop>span")).toHaveText([
    "Record",
    "↓Plan savings",
    "↓Check a purchase",
    "↓Review context",
    "↓Optional explanation",
  ]);
  await page.goto("/security");
  await expect(page.locator("[data-security-section]")).toHaveCount(7);
  await expect(page.locator(".wallet-boundary")).toContainText(
    "not a wallet connection",
  );
  expect(requests).toEqual([]);
});

test("auth password visibility preserves values and supports keyboard and autocomplete", async ({
  page,
}) => {
  await fixture(page);
  for (const path of ["/login", "/signup"]) {
    await page.goto(path);
    const password = page.getByLabel("Password", { exact: true });
    await expect(
      page.getByLabel("Email address", { exact: true }),
    ).toHaveAttribute(
      "placeholder",
      path === "/login" ? "Enter your email" : "Enter your email address",
    );
    await expect(password).toHaveAttribute(
      "autocomplete",
      path === "/login" ? "current-password" : "new-password",
    );
    if (path === "/signup")
      await expect(
        page.getByLabel("Full name", { exact: true }),
      ).toHaveAttribute("placeholder", "Enter your full name");
    await password.fill("Synthetic-password-123");
    await expect(password).toHaveAttribute("type", "password");
    const show = page.getByRole("button", {
      name: "Show password",
      exact: true,
    });
    await expect(show).toHaveAttribute("type", "button");
    await show.focus();
    await page.keyboard.press("Enter");
    await expect(password).toHaveAttribute("type", "text");
    await expect(password).toHaveValue("Synthetic-password-123");
    await expect(page).toHaveURL(path);
    await page
      .getByRole("button", { name: "Hide password", exact: true })
      .click();
    await expect(password).toHaveAttribute("type", "password");
    await expect(password).toHaveValue("Synthetic-password-123");
    const labels = await password.evaluate(
      (input) => (input as HTMLInputElement).labels?.length,
    );
    expect(labels).toBe(1);
  }
});

test("workspace branding and public home link return to authenticated public navigation", async ({
  page,
}) => {
  await fixture(page);
  await login(page);
  const brand = page
    .locator(".sidebar")
    .getByRole("link", { name: "Upay Financial Coach", exact: true });
  await expect(brand).toHaveAttribute("href", "/");
  await brand.click();
  await expect(page).toHaveURL("/");
  await openPublicMenu(page);
  await expect(
    page
      .locator(".public-header")
      .getByRole("link", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await page.goto("/dashboard");
  await openAppMenu(page);
  const home = page
    .locator(".sidebar")
    .getByRole("link", { name: "Public Home", exact: true });
  await expect(home).toHaveAttribute("href", "/");
  await home.click();
  await expect(page).toHaveURL("/");
});

test("blue yellow visual review at desktop tablet and mobile widths", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000); // Full-page captures for all public routes at four widths.
  const state = await fixture(page, false, true);
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    if (width !== 1440) {
      await page.goto("/");
      await openPublicMenu(page);
      await page
        .locator(".public-header")
        .getByRole("button", { name: "Sign out", exact: true })
        .click();
    }
    for (const path of [
      "/",
      "/about",
      "/features",
      "/how-it-works",
      "/security",
      "/login",
      "/signup",
    ]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.locator(".brand-logo").first()).toBeVisible();
      await expect
        .poll(() =>
          page
            .locator(".brand-logo")
            .first()
            .evaluate(
              (image: HTMLImageElement) =>
                image.complete && image.naturalWidth > 0,
            ),
        )
        .toBe(true);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: testInfo.outputPath(
          `${path === "/" ? "home" : path.slice(1)}-${width}.png`,
        ),
        fullPage: true,
        scale: "css",
      });
    }
    await login(page);
    for (const path of [
      "/dashboard",
      "/transactions",
      "/goals",
      `/goals/${goalId}`,
      "/analytics",
      "/coach",
      "/planning",
      "/profile",
    ]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.locator(".loading")).toHaveCount(0);
      if (path === "/coach") {
        await openConversations(page);
        await page
          .getByRole("button", {
            name: "Planning my emergency fund",
            exact: false,
          })
          .click();
        await expect(page.locator("article.message")).toHaveCount(3);
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: testInfo.outputPath(
          `${path.slice(1).replaceAll("/", "-")}-${width}.png`,
        ),
        fullPage: true,
        scale: "css",
      });
    }
  }
  expect(state.errors).toEqual([]);
});

test("supplied hero banners load, loop, pause, swipe, and respect reduced motion", async ({
  page,
}) => {
  test.setTimeout(90000);
  const state = await fixture(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const slider = page.getByRole("region", {
    name: "Promotional image carousel",
  });
  const dots = slider.getByRole("button", { name: /Show promotional slide/ });
  const count = await dots.count();
  await expect(slider.locator("h1, p, a")).toHaveCount(0);
  await expect(slider.getByText("Pause", { exact: true })).toHaveCount(0);
  expect(
    await page
      .locator(".public-main")
      .evaluate((main) =>
        main.firstElementChild?.classList.contains("home-intro"),
      ),
  ).toBe(true);
  await expect(page.locator(".home-intro + .container")).toContainText(
    "Supplied Upay promotional imagery",
  );
  await expect(
    page.locator(".home-intro + .container + .hero-slider"),
  ).toHaveCount(1);
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index++) {
    await dots.nth(index).click();
    await expect(dots.nth(index)).toHaveAttribute("aria-current", "true");
    await expect
      .poll(() =>
        slider
          .locator(".hero-slide[data-active=true] img")
          .evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
          ),
      )
      .toBe(true);
  }
  await slider.getByRole("button", { name: "Next promotional slide" }).click();
  await expect(dots.first()).toHaveAttribute("aria-current", "true");
  await slider
    .getByRole("button", { name: "Previous promotional slide" })
    .click();
  await expect(dots.last()).toHaveAttribute("aria-current", "true");
  await dots.first().click();
  await dots.first().press("ArrowRight");
  await expect(dots.nth(1)).toHaveAttribute("aria-current", "true");
  for (const width of [320, 375, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(slider).toBeVisible();
    expect(
      await slider.evaluate((node) =>
        Math.round(node.getBoundingClientRect().width),
      ),
    ).toBe(width);
    const intro = page.locator(".home-intro");
    const geometry = await slider
      .locator(".hero-slider-stage")
      .evaluate((node) => {
        const rect = node.getBoundingClientRect();
        const ratio = Number(
          (node as HTMLElement).style.getPropertyValue("--banner-aspect"),
        );
        return rect.height / (rect.width / ratio);
      });
    expect(geometry).toBeCloseTo(width >= 1024 ? 0.8 : 1, 2);
    const visual = intro.getByLabel(
      "Illustrative financial coaching workspace",
    );
    await expect(visual).toBeVisible();
    await expect(visual.getByText("BDT 15,000", { exact: true })).toBeVisible();
    await expect(
      visual.getByLabel("Demo savings goal 25 percent complete"),
    ).toHaveAttribute("value", "25");
    const layout = await intro.evaluate((node) => {
      const text = node.querySelector(".hero-copy")!.getBoundingClientRect();
      const visual = node
        .querySelector(".hero-visual")!
        .getBoundingClientRect();
      return {
        stacked: visual.top >= text.bottom,
        sideBySide: visual.left >= text.right,
      };
    });
    expect(width <= 900 ? layout.stacked : layout.sideBySide).toBe(true);
    expect(
      await slider.evaluate((node) => node.getBoundingClientRect().top),
    ).toBeGreaterThanOrEqual(
      await intro.evaluate((node) => node.getBoundingClientRect().bottom),
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    expect(
      await slider
        .locator(".hero-slide[data-active=true] img")
        .evaluate((img) => getComputedStyle(img).objectFit),
    ).toBe("contain");
  }
  await dots.first().click();
  await page.mouse.click(1, 1);
  await page.waitForTimeout(4700);
  await expect(dots.first()).toHaveAttribute("aria-current", "true");
  const stage = slider.locator(".hero-slider-stage");
  await stage.evaluate((node) => {
    const start = new Touch({ identifier: 1, target: node, clientX: 200 });
    const end = new Touch({ identifier: 1, target: node, clientX: 100 });
    node.dispatchEvent(
      new TouchEvent("touchstart", { bubbles: true, touches: [start] }),
    );
    node.dispatchEvent(
      new TouchEvent("touchend", { bubbles: true, changedTouches: [end] }),
    );
  });
  await expect(dots.nth(1)).toHaveAttribute("aria-current", "true");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await dots.first().click();
  await stage.hover();
  await page.mouse.click(1, 1);
  await stage.hover();
  await page.waitForTimeout(4700);
  await expect(dots.first()).toHaveAttribute("aria-current", "true");
  await page.mouse.move(1, 1);
  await expect(dots.nth(1)).toHaveAttribute("aria-current", "true", {
    timeout: 6500,
  });
  await dots.first().focus();
  const focused = await slider
    .locator("[aria-current=true]")
    .getAttribute("aria-label");
  await page.waitForTimeout(4700);
  await expect(slider.locator("[aria-current=true]")).toHaveAttribute(
    "aria-label",
    focused!,
  );
  expect(state.errors).toEqual([]);
});
