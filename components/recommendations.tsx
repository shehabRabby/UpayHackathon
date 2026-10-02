"use client";
import { useAuth } from "./auth-provider";
import { useAction, useResource } from "@/lib/frontend/hooks";
import type { Recommendation } from "@/lib/frontend/types";
import { Empty, Notice, ResourceState } from "./ui";
export function Recommendations() {
  const { request } = useAuth();
  const resource = useResource<Recommendation[]>(
    "/recommendations?page=1&pageSize=10",
  );
  const action = useAction();
  return (
    <section className="card">
      <h2>Your recommendations</h2>
      <ResourceState {...resource} />
      <Notice error={action.error} success={action.success} />
      {resource.data?.length === 0 && (
        <Empty>
          Recommendations will appear after you talk with your AI coach.
        </Empty>
      )}
      {resource.data?.map((item) => (
        <article className="recommendation" key={item.recommendationId}>
          <div className="row">
            <span className="badge">
              {item.recommendationType} · {item.priority}
            </span>
            <small>{item.status}</small>
          </div>
          <p>{item.recommendationText}</p>
          <div className="actions">
            {(["VIEWED", "COMPLETED", "DISMISSED"] as const)
              .filter((status) => status !== item.status)
              .map((status) => (
                <button
                  className="secondary"
                  key={status}
                  disabled={action.busy}
                  onClick={() =>
                    action.run(async () => {
                      await request(
                        `/recommendations/${item.recommendationId}`,
                        { method: "PATCH", body: { status } },
                      );
                      resource.reload();
                    }, "Recommendation updated.")
                  }
                >
                  {status === "VIEWED"
                    ? "Mark read"
                    : status === "COMPLETED"
                      ? "Complete"
                      : "Dismiss"}
                </button>
              ))}
          </div>
        </article>
      ))}
    </section>
  );
}
