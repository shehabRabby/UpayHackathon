import { body, handle, ApiError, success } from "@/lib/api";
import { authenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profileCreate } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handle(async (request: Request) => {
  const user = await authenticatedUser(request);
  const input = await body(request, profileCreate);
  if (!user.email) throw new ApiError(400, "An email is required for the application profile");
  const data = { full_name: input.fullName, email: user.email,
    ...(input.phone !== undefined ? { phone: input.phone } : {}), preferred_language: input.preferredLanguage };
  const profile = await prisma.users.upsert({ where: { user_id: user.id },
    create: { user_id: user.id, ...data }, update: data });
  return success({ userId: profile.user_id, fullName: profile.full_name, email: profile.email,
    phone: profile.phone, preferredLanguage: profile.preferred_language }, "Application profile synchronized");
});
