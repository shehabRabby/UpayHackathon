import { handle, success } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async (request: Request) => {
  await requireUser(request);
  const input = z.strictObject({ type: z.enum(["income", "expense"]).optional() })
    .parse(Object.fromEntries(new URL(request.url).searchParams));
  const categories = await prisma.categories.findMany({ where: { is_active: true,
    ...(input.type ? { category_type: input.type } : {}) }, orderBy: { category_name: "asc" } });
  return success(categories.map(item => ({ categoryId: item.category_id, categoryName: item.category_name,
    categoryType: item.category_type, description: item.description, isActive: item.is_active })), "Categories retrieved");
});
