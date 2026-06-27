const API_BASE = "http://localhost:3000";
const TEST_GROUP_UI_FLAG = "test-group-ui-flag";

// --- health check on startup ---
window.addEventListener("DOMContentLoaded", async () => {
    applyTestGroupUIExperiment();
    try {
        const res = await fetch(`${API_BASE}/health`);
        const data = await res.json();

        if (!res.ok) {
            showOutput(`Health check failed: ${data.error || res.status}`);
            return;
        }

        showOutput(`Backend OK: ${data.status}`);
    } catch (err) {
        showOutput("Backend unreachable (network error)");
    }
});

async function saveNote() {
    const text = document.getElementById("note").value;
    const passphrase = document.getElementById("key").value;
    const variant = window.posthog
        ? posthog.getFeatureFlag(TEST_GROUP_UI_FLAG) || "group_a"
        : "group_a";

    if (window.posthog) {
        posthog.capture("note_save_started", { variant });
    }
    try {

        const headers = {
            "Content-Type": "application/json",
        };
        
        // Forward PostHog identity context so backend events belong to the same user/session
        if (window.posthog) {
            headers["X-PostHog-Distinct-Id"] = posthog.get_distinct_id();
            headers["X-PostHog-Session-Id"] = posthog.get_session_id();
        }

        const res = await fetch(`${API_BASE}/notes`, {
            method: "POST", 
            headers,
            body: JSON.stringify({ text, passphrase })
        });

        const data = await safeJson(res);

        if (!res.ok) {
            showOutput(data?.error || `Request failed (${res.status})`);
            return;
        }

        showOutput(`Stored. ID = ${data.id}`);
        document.getElementById("noteId").value = data.id;
    } catch (err) {
        showOutput("Network error while saving");
    }
}

async function loadNote() {
    const id = document.getElementById("noteId").value;
    const passphrase = document.getElementById("key").value;

    try {
        const res = await fetch(
            `${API_BASE}/notes/${id}?passphrase=${encodeURIComponent(passphrase)}`
        );

        const data = await safeJson(res);

        if (!res.ok) {
            showOutput(data?.error || `Request failed (${res.status})`);
            return;
        }

        document.getElementById("note").value = data.content;
        showOutput("Note loaded successfully");
    } catch (err) {
        showOutput("Network error while loading");
    }
}

function showOutput(msg) {
    document.getElementById("output").textContent = msg;
}

async function safeJson(res) {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

function applyTestGroupUIExperiment() {
    if (!window.posthog) {
        return;
    }

    posthog.onFeatureFlags(() => {
        const variant = posthog.getFeatureFlag(TEST_GROUP_UI_FLAG);
        const saveButton = document.getElementById("saveButton");
        const container = document.querySelector(".container");
        const output = document.getElementById("output");

        if (!saveButton) {
            return;
        }

        const isTestGroup = variant === "group_b";

        saveButton.classList.toggle("button-green", isTestGroup);
        document.body.classList.toggle("experiment-bg-beige", isTestGroup);
        container.classList.toggle("experiment-container-brown", isTestGroup);
        output.classList.toggle("experiment-output-brown", isTestGroup);
    });
}