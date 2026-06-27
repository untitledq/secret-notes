import { PostHog } from "posthog-node";

const projectKey = process.env.POSTHOG_PROJECT_KEY;
const host = process.env.POSTHOG_HOST || "https://us.i.posthog.com";

export const posthog = projectKey
  ? new PostHog(projectKey, { host })
  : null;

export function captureEvent(request, event, properties = {}) {
  if (!posthog) {
    return;
  }

  const distinctId =
    request.headers["x-posthog-distinct-id"] ||
    request.ip ||
    "anonymous";

  const sessionId = request.headers["x-posthog-session-id"];

  posthog.capture({
    distinctId: String(distinctId),
    event,
    properties: {
      ...properties,
      ...(sessionId ? { $session_id: String(sessionId) } : {}),
      $request_path: request.url,
      $request_method: request.method,
      $user_agent: request.headers["user-agent"],
    },
  });
}