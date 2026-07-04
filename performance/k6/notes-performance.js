import http from "k6/http";
import { check, sleep } from "k6";

// Target backend URL. In CI this should point to the deployed staging backend.
const BASE_URL = (__ENV.K6_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

// Load profile and pass/fail thresholds can be tuned with GitLab CI/CD variables.
const VUS = Number(__ENV.K6_VUS || 1);
const DURATION = __ENV.K6_DURATION || "30s";
const P95_THRESHOLD = __ENV.K6_P95_THRESHOLD || "750";
const ERROR_RATE_THRESHOLD = __ENV.K6_ERROR_RATE_THRESHOLD || "0.01";

// k6 fails the job when one of these thresholds is violated.
export const options = {
  vus: VUS,
  duration: DURATION,
  thresholds: {
    http_req_failed: [`rate<${ERROR_RATE_THRESHOLD}`],
    http_req_duration: [`p(95)<${P95_THRESHOLD}`],
    checks: ["rate>0.99"],
  },
};

// Read JSON values defensively so non-JSON error responses do not crash the script.
function jsonValue(response, selector) {
  try {
    return response.json(selector);
  } catch {
    return undefined;
  }
}

export default function () {
  // Each iteration uses unique data to avoid collisions between virtual users.
  const uniqueSuffix = `${__VU}-${__ITER}-${Date.now()}`;
  const passphrase = `k6-passphrase-${uniqueSuffix}`;
  const noteText = `k6 performance test note ${uniqueSuffix}`;

  // 1. Verify that the deployed backend is reachable.
  const health = http.get(`${BASE_URL}/health`);
  check(health, {
    "health returns 200": (res) => res.status === 200,
    "health status is ok": (res) => jsonValue(res, "status") === "ok",
  });

  // 2. Test the main write path: create an encrypted secret note.
  const create = http.post(
    `${BASE_URL}/notes`,
    JSON.stringify({
      text: noteText,
      passphrase,
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  // The backend should return the new note id after storing encrypted content.
  const noteId = jsonValue(create, "id");
  check(create, {
    "create note returns 200": (res) => res.status === 200,
    "create note returns id": () => Number.isInteger(noteId),
  });

  if (Number.isInteger(noteId)) {
    // 3. Test the main read path: retrieve and decrypt the note with the same passphrase.
    const read = http.get(
      `${BASE_URL}/notes/${noteId}?passphrase=${encodeURIComponent(passphrase)}`
    );

    check(read, {
      "read note returns 200": (res) => res.status === 200,
      "read note returns plaintext": (res) => jsonValue(res, "content") === noteText,
    });
  }

  // Small pause between iterations to avoid unrealistic tight-loop traffic.
  sleep(1);
}
