import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export class ApiError extends Error {
  constructor(
    public status: 400 | 401 | 403 | 404 | 429 | 500,
    message: string,
    public retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

export function success<T>(
  data: T,
  message = "Success",
  status = 200,
  meta?: unknown,
) {
  return NextResponse.json(
    { success: true, message, data, ...(meta ? { meta } : {}) },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export function failure(error: unknown) {
  let status = 500;
  let message = "An unexpected server error occurred";
  let meta: unknown;
  if (error instanceof ApiError) {
    status = error.status;
    message = error.message;
  } else if (error instanceof z.ZodError) {
    status = 400;
    message = "Validation failed";
    meta = {
      issues: error.issues.map(({ path, message }) => ({ path, message })),
    };
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      status = 404;
      message = "Resource not found";
    }
    if (["P2002", "P2003", "P2004", "P2034"].includes(error.code)) {
      status = 400;
      message =
        "The request conflicts with the current data; refresh and try again";
    }
  }
  // Do not log database URLs, request bodies, financial records, or access tokens.
  if (status === 500)
    console.error("API request failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
  return NextResponse.json(
    { success: false, message, data: null, ...(meta ? { meta } : {}) },
    {
      status,
      headers: { "Cache-Control": "no-store", ...(error instanceof ApiError && error.status === 429 && error.retryAfterSeconds ? { "Retry-After": String(error.retryAfterSeconds) } : {}) },
    },
  );
}

export function handle<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
) {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (error) {
      return failure(error);
    }
  };
}

export async function body<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.output<S>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON");
  }
  return schema.parse(json);
}

export type IdContext = { params: Promise<{ id: string }> };
export async function resourceId(context: IdContext) {
  return z.uuid().parse((await context.params).id);
}
