import { NextResponse, type NextRequest } from "next/server";

const methods: [RegExp, string[]][] = [
  [/^\/api\/v1\/coach\/conversations$/, ["GET", "HEAD", "POST"]],
  [/^\/api\/v1\/coach\/conversations\/[^/]+$/, ["DELETE"]],
  [/^\/api\/v1\/coach\/conversations\/[^/]+\/messages$/, ["GET", "HEAD", "POST"]],
  [/^\/api\/v1\/recommendations$/, ["GET", "HEAD"]],
  [/^\/api\/v1\/recommendations\/[^/]+$/, ["PATCH"]],
  [/^\/api\/v1\/simulator\/what-if$/, ["POST"]],
  [/^\/api\/v1\/affordability\/check$/, ["POST"]],
  [/^\/api\/v1\/analytics\/spending$/, ["GET", "HEAD"]],
  [/^\/api\/v1\/analytics\/refresh$/, ["POST"]],
  [/^\/api\/v1\/financial-health$/, ["GET", "HEAD"]],
  [/^\/api\/v1\/financial-health\/refresh$/, ["POST"]],
  [/^\/api\/v1\/goals\/[^/]+\/savings-plan$/, ["POST"]],
  [/^\/api\/v1\/goals$/, ["GET", "HEAD", "POST"]],
  [/^\/api\/v1\/goals\/[^/]+$/, ["GET", "HEAD", "PATCH", "DELETE"]],
  [/^\/api\/v1\/goals\/[^/]+\/contributions$/, ["GET", "HEAD", "POST"]],
  [/^\/api\/v1\/transactions$/, ["GET", "HEAD", "POST"]],
  [/^\/api\/v1\/transactions\/[^/]+$/, ["GET", "HEAD", "PATCH", "DELETE"]],
  [/^\/api\/v1\/dashboard\/summary$/, ["GET", "HEAD"]],
  [/^\/api\/v1\/categories$/, ["GET", "HEAD"]],
  [/^\/api\/v1\/auth\/profile$/, ["GET", "HEAD", "POST"]],
];

export function proxy(request: NextRequest) {
  const route = methods.find(([pattern]) => pattern.test(request.nextUrl.pathname));
  if (route && !route[1].includes(request.method)) {
    return NextResponse.json({ success: false, message: "HTTP method is not supported for this endpoint", data: null },
      { status: 400, headers: { "Cache-Control": "no-store", Allow: route[1].join(", ") } });
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/v1/:path*" };
