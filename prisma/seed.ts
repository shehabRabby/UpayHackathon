import "dotenv/config";
import { prisma } from "../lib/prisma";
async function main() {
  const categories = [
    { category_name: "Cash In", category_type: "income" },
    { category_name: "Cash Out", category_type: "expense" },
    { category_name: "Shopping", category_type: "expense" },
    { category_name: "Mobile Recharge", category_type: "expense" },
    { category_name: "Food", category_type: "expense" },
    { category_name: "Transport", category_type: "expense" },
  ];
  for (const category of categories) {
    if (!(await prisma.categories.findFirst({ where: category }))) {
      await prisma.categories.create({ data: category });
    }
  }
  console.log("Default categories are available");
}
main()
  .catch(() => {
    console.error("Category seed failed; check database connectivity");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
