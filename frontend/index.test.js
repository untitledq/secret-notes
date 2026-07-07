function renderAppDom() {
  document.body.innerHTML = `
    <link rel="icon" href="data:,">
    <div class="icon-background" aria-hidden="true">
      <div class="icon-escalator icon-escalator-a"></div>
      <div class="icon-escalator icon-escalator-b"></div>
    </div>
    <div class="container">
      <h1>Secret Notes</h1>
      <div class="tabs" role="tablist">
        <button id="createTab" class="tab-button is-active" type="button" role="tab" aria-selected="true">Create</button>
        <button id="loadTab" class="tab-button" type="button" role="tab" aria-selected="false">Load</button>
      </div>
      <section id="createPanel" class="tab-panel">
        <textarea id="createNote"></textarea>
        <div id="createNoteVault" class="note-vault">
          <div class="vault-overlay encrypt-overlay"></div>
          <div class="vault-door-left"></div>
          <div class="vault-door-right"></div>
          <div class="vault-line"></div>
          <div class="vault-lock"></div>
          <div class="lock-shackle"></div>
          <div class="heart-sticker"></div>
          <div class="love-envelope-back"></div>
          <div class="love-envelope-flap"></div>
          <div class="love-envelope-front"></div>
        </div>
        <input id="createKey" type="password" />
        <button id="saveButton" type="button">Save</button>
      </section>
      <section id="loadPanel" class="tab-panel is-hidden">
        <input id="loadNoteId" />
        <input id="loadKey" type="password" />
        <div id="loadNoteVault" class="note-vault is-locked">
          <textarea id="loadNoteContent" readonly></textarea>
          <div class="vault-overlay"></div>
          <div class="vault-door-left"></div>
          <div class="vault-door-right"></div>
          <div class="vault-line"></div>
          <div class="vault-lock"></div>
          <div class="lock-shackle"></div>
          <div class="heart-sticker"></div>
          <div class="love-envelope-back"></div>
          <div class="love-envelope-flap"></div>
          <div class="love-envelope-front"></div>
        </div>
        <button id="loadButton" type="button">Load</button>
      </section>
      <pre id="output" role="status"></pre>
    </div>
  `;
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body)
  };
}

function invalidJsonResponse(status = 500) {
  return {
    ok: false,
    status,
    json: jest.fn().mockRejectedValue(new Error("invalid json"))
  };
}

async function flushAsyncWork() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("Secret Notes frontend", () => {
  beforeEach(() => {
    jest.resetModules();

    globalThis.APP_CONFIG = {
      API_BASE_URL: "http://localhost:3001"
    };
    
    renderAppDom();
    globalThis.innerWidth = 1024;
    globalThis.fetch = jest.fn();
    delete globalThis.gsap;
    delete globalThis.posthog;
  
  });

  test("shows backend health status on startup", async () => {
    globalThis.fetch.mockResolvedValueOnce(jsonResponse({ status: "ok" }));

    await require("./app.js");
    globalThis.dispatchEvent(new Event("DOMContentLoaded"));
    await flushAsyncWork();

    expect(globalThis.fetch).toHaveBeenCalledWith(`${globalThis.APP_CONFIG.API_BASE_URL}/health`);
    expect(document.getElementById("output").textContent).toBe("Backend OK: ok");
  });

  test("shows backend health errors on startup", async () => {
    globalThis.fetch.mockResolvedValueOnce(jsonResponse({ error: "db down" }, 503));

    await require("./app.js");
    globalThis.dispatchEvent(new Event("DOMContentLoaded"));
    await flushAsyncWork();

    expect(document.getElementById("output").textContent).toBe("Health check failed: db down");
  });

  test("shows network health errors on startup", async () => {
    globalThis.fetch.mockRejectedValueOnce(new Error("offline"));

    await require("./app.js");
    globalThis.dispatchEvent(new Event("DOMContentLoaded"));
    await flushAsyncWork();

    expect(document.getElementById("output").textContent).toBe("Backend unreachable (network error)");
  });

  test("switches from create tab to load tab", () => {
    globalThis.SecretNotes.setupTabs();

    document.getElementById("loadTab").click();

    expect(document.getElementById("loadTab").classList.contains("is-active")).toBe(true);
    expect(document.getElementById("loadTab").getAttribute("aria-selected")).toBe("true");
    expect(document.getElementById("createPanel").classList.contains("is-hidden")).toBe(true);
    expect(document.getElementById("loadPanel").classList.contains("is-hidden")).toBe(false);
  });

  test("switches back from load tab to create tab", () => {
    globalThis.SecretNotes.setupTabs();

    document.getElementById("loadTab").click();
    document.getElementById("createTab").click();

    expect(document.getElementById("createTab").classList.contains("is-active")).toBe(true);
    expect(document.getElementById("createTab").getAttribute("aria-selected")).toBe("true");
    expect(document.getElementById("loadPanel").classList.contains("is-hidden")).toBe(true);
  });

  test("saves a note and copies the returned id into the load form", async () => {
    document.getElementById("createNote").value = "top secret";
    document.getElementById("createKey").value = "correct horse battery staple";
    globalThis.fetch.mockResolvedValueOnce(jsonResponse({ id: 42 }));

    await globalThis.saveNote();

    expect(globalThis.fetch).toHaveBeenCalledWith(`${globalThis.APP_CONFIG.API_BASE_URL}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "top secret",
        passphrase: "correct horse battery staple"
      })
    });
    expect(document.getElementById("output").textContent).toBe("Stored. ID = 42");
    expect(document.getElementById("loadNoteId").value).toBe(String(42));
  });

  test("shows API validation errors while saving", async () => {
    globalThis.fetch.mockResolvedValueOnce(jsonResponse({ error: "Empty text or passphrase" }, 400));

    await globalThis.saveNote();

    expect(document.getElementById("output").textContent).toBe("Empty text or passphrase");
    expect(document.getElementById("loadNoteId").value).toBe("");
  });

  test("shows network errors while saving", async () => {
    globalThis.fetch.mockRejectedValueOnce(new Error("offline"));

    await globalThis.saveNote();

    expect(document.getElementById("output").textContent).toBe("Network error while saving");
  });

  test("loads a note by sending the passphrase in the request body", async () => {
    document.getElementById("loadNoteId").value = "9";
    document.getElementById("loadKey").value = "key with spaces & symbols";
    globalThis.fetch.mockResolvedValueOnce(jsonResponse({ id: 9, content: "opened note" }));

    await globalThis.loadNote();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${globalThis.APP_CONFIG.API_BASE_URL}/notes/9/decrypt`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase: "key with spaces & symbols" })
      }
    );
    expect(document.getElementById("loadNoteContent").value).toBe("opened note");
    expect(document.getElementById("output").textContent).toBe("Note loaded successfully");
  });

  test("shows invalid key errors while loading", async () => {
    document.getElementById("loadNoteId").value = "9";
    document.getElementById("loadKey").value = "wrong";
    globalThis.fetch.mockResolvedValueOnce(jsonResponse({ error: "Invalid key or corrupted data" }, 403));

    await globalThis.loadNote();

    expect(document.getElementById("output").textContent).toBe("Invalid key or corrupted data");
    expect(document.getElementById("loadNoteContent").value).toBe("");
  });

  test("falls back to status text when an error response is not JSON", async () => {
    globalThis.fetch.mockResolvedValueOnce(invalidJsonResponse(500));

    await globalThis.saveNote();

    expect(document.getElementById("output").textContent).toBe("Request failed (500)");
  });

  test("adds PostHog identity headers when saving", async () => {
    globalThis.posthog = {
      capture: jest.fn(),
      getFeatureFlag: jest.fn().mockReturnValue("group_b"),
      get_distinct_id: jest.fn().mockReturnValue("distinct-user"),
      get_session_id: jest.fn().mockReturnValue("session-123")
    };
    document.getElementById("createNote").value = "note";
    document.getElementById("createKey").value = "pw";
    globalThis.fetch.mockResolvedValueOnce(jsonResponse({ id: 7 }));

    await globalThis.saveNote();

    expect(globalThis.fetch.mock.calls[0][1].headers).toMatchObject({
      "X-PostHog-Distinct-Id": "distinct-user",
      "X-PostHog-Session-Id": "session-123"
    });
    expect(globalThis.posthog.capture).toHaveBeenCalledWith("note_save_started", { variant: "group_b" });
  });

  test("clears the create fields after the encrypt animation finishes", () => {
    jest.useFakeTimers();
    document.getElementById("createNote").value = "top secret";
    document.getElementById("createKey").value = "pw";

    globalThis.SecretNotes.finishEncryptAnimation();
    jest.advanceTimersByTime(1500);

    expect(document.getElementById("createNote").value).toBe("");
    expect(document.getElementById("createKey").value).toBe("");
    jest.useRealTimers();
  });

  test("applies the group B visual experiment", () => {
    globalThis.posthog = {
      onFeatureFlags: jest.fn((callback) => callback()),
      getFeatureFlag: jest.fn().mockReturnValue("group_b")
    };

    globalThis.SecretNotes.applyTestGroupUIExperiment();

    expect(document.getElementById("saveButton").classList.contains("button-green")).toBe(true);
    expect(document.body.classList.contains("experiment-bg-beige")).toBe(true);
    expect(document.querySelector(".container").classList.contains("experiment-container-brown")).toBe(true);
    expect(document.getElementById("output").classList.contains("experiment-output-brown")).toBe(true);
  });
});
