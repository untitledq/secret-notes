const API_BASE = "http://localhost:3000";
const SAVE_BUTTON_COLOR_FLAG = "save-button-color";

// --- health check on startup ---
window.addEventListener("DOMContentLoaded", async () => {
    applySaveButtonExperiment();
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
        ? posthog.getFeatureFlag(SAVE_BUTTON_COLOR_FLAG) || "control"
        : "control";

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

function applySaveButtonExperiment() {
    if (!window.posthog) {
        return;
    }

    posthog.onFeatureFlags(() => {
        const variant = posthog.getFeatureFlag(SAVE_BUTTON_COLOR_FLAG);
        const saveButton = document.getElementById("saveButton");

        if (!saveButton) {
            return;
        }

        if (variant === "green") {
            saveButton.classList.add("button-green");
        } else {
            saveButton.classList.remove("button-green");
        }
    });
}