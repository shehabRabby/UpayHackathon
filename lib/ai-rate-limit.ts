import "server-only";
import { ApiError } from "./api";

// Prototype protection only: each server process has its own rolling window.
// Failed provider attempts count; committed coach replays never reach this gate.
export const AI_REQUEST_LIMIT = 6;
export const AI_WINDOW_MS = 60_000;
const MAX_USERS = 10_000;

export function createAiRateLimiter(now = () => performance.now(), maxUsers = MAX_USERS) {
  const users = new Map<string, number[]>();
  return (userId: string) => {
    const time = now();
    for (const [id, attempts] of users) {
      const active = attempts.filter(attempt => time - attempt < AI_WINDOW_MS);
      if (active.length) users.set(id, active);
      else users.delete(id);
    }
    const attempts = users.get(userId) ?? [];
    if (attempts.length >= AI_REQUEST_LIMIT) {
      throw new ApiError(429, "AI request limit reached; wait before trying again. Calculations remain available.",
        Math.max(1, Math.ceil((AI_WINDOW_MS - (time - attempts[0])) / 1000)));
    }
    // Do not evict active users and accidentally reset their allowance.
    if (!users.has(userId) && users.size >= maxUsers)
      throw new ApiError(429, "AI is temporarily busy; try again later. Calculations remain available.", 60);
    attempts.push(time);
    users.set(userId, attempts);
  };
}

export const requireAiAllowance = createAiRateLimiter();
