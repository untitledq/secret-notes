const API_BASE = "http://localhost:3000";
const TEST_GROUP_UI_FLAG = "test-group-ui-flag";

// --- health check on startup ---
window.addEventListener("DOMContentLoaded", async () => {
    setupTabs();
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
    const text = document.getElementById("createNote").value;
    const passphrase = document.getElementById("createKey").value;
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
        document.getElementById("loadNoteId").value = data.id;
    } catch (err) {
        showOutput("Network error while saving");
    }
}

async function loadNote() {
    const id = document.getElementById("loadNoteId").value;
    const passphrase = document.getElementById("loadKey").value;
    const noteContent = document.getElementById("loadNoteContent");

    resetVaultAnimation();

    try {
        const res = await fetch(
            `${API_BASE}/notes/${id}?passphrase=${encodeURIComponent(passphrase)}`
        );

        const data = await safeJson(res);

        if (!res.ok) {
            playVaultErrorAnimation();
            showOutput(data?.error || `Request failed (${res.status})`);
            return;
        }

        noteContent.value = data.content;
        playVaultOpenAnimation();
        showOutput("Note loaded successfully");
    } catch (err) {
        playVaultErrorAnimation();
        showOutput("Network error while loading");
    }
}

function showOutput(msg) {
    document.getElementById("output").textContent = msg;
}

function setupTabs() {
    const createTab = document.getElementById("createTab");
    const loadTab = document.getElementById("loadTab");
    const createPanel = document.getElementById("createPanel");
    const loadPanel = document.getElementById("loadPanel");

    if (!createTab || !loadTab || !createPanel || !loadPanel) {
        return;
    }

    createTab.addEventListener("click", () => {
        setActiveTab("create");
    });

    loadTab.addEventListener("click", () => {
        setActiveTab("load");
    });
}

function setActiveTab(activeTab) {
    const isCreate = activeTab === "create";
    const createTab = document.getElementById("createTab");
    const loadTab = document.getElementById("loadTab");
    const createPanel = document.getElementById("createPanel");
    const loadPanel = document.getElementById("loadPanel");

    createTab.classList.toggle("is-active", isCreate);
    createTab.setAttribute("aria-selected", String(isCreate));
    loadTab.classList.toggle("is-active", !isCreate);
    loadTab.setAttribute("aria-selected", String(!isCreate));
    createPanel.classList.toggle("is-hidden", !isCreate);
    loadPanel.classList.toggle("is-hidden", isCreate);

    if (!isCreate) {
        resetVaultAnimation();
    }
}

function resetVaultAnimation() {
    const vault = document.getElementById("loadNoteVault");
    const overlay = document.getElementById("vaultOverlay");

    if (vault) {
        vault.classList.add("is-locked");
    }

    if (overlay) {
        overlay.style.display = "";
    }

    if (!window.gsap) {
        return;
    }

    gsap.killTweensOf(".vault-door-left, .vault-door-right, .vault-line, .vault-lock, .lock-shackle, .heart-sticker, .love-envelope-back, .love-envelope-flap, .love-envelope-front");
    gsap.set(".vault-door-left", { xPercent: 0 });
    gsap.set(".vault-door-right", { xPercent: 0 });
    gsap.set(".vault-line", { scaleY: 1, opacity: 1, transformOrigin: "center center" });
    gsap.set(".vault-lock", { opacity: 1, scale: 1, rotation: 0 });
    gsap.set(".lock-shackle", { rotation: 0, x: 0, y: 0, transformOrigin: "left bottom" });
    gsap.set(".heart-sticker", {
        x: 0,
        y: 0,
        opacity: 1,
        scale: 1,
        rotation: -8,
        transformOrigin: "center center"
    });
    gsap.set(".love-envelope-back", { opacity: 1, yPercent: 0 });
    gsap.set(".love-envelope-flap", {
        opacity: 1,
        rotationX: 0,
        yPercent: 0,
        transformOrigin: "top center",
        transformPerspective: 420
    });
    gsap.set(".love-envelope-front", { opacity: 1, yPercent: 0 });
}

function playVaultOpenAnimation() {
    const vault = document.getElementById("loadNoteVault");
    const isLoveLetterVariant = document
        .querySelector(".container")
        ?.classList.contains("experiment-container-brown");

    if (vault) {
        vault.classList.remove("is-locked");
    }

    if (!window.gsap) {
        const overlay = document.getElementById("vaultOverlay");

        if (overlay) {
            overlay.style.display = "none";
        }

        return;
    }

    if (isLoveLetterVariant) {
        playLoveLetterOpenAnimation();
        return;
    }

    gsap.timeline()
        .to(".lock-shackle", {
            rotation: 32,
            x: 5,
            y: -3,
            duration: 0.28,
            ease: "back.out(1.8)"
        })
        .to(".vault-lock", {
            scale: 0.92,
            opacity: 0,
            duration: 0.2,
            ease: "power1.out"
        }, "+=0.06")
        .to(".vault-line", {
            scaleY: 0,
            opacity: 0,
            duration: 0.22,
            ease: "power2.inOut"
        }, "-=0.08")
        .to(".vault-door-left", {
            xPercent: -104,
            duration: 0.55,
            ease: "power3.inOut"
        }, "-=0.02")
        .to(".vault-door-right", {
            xPercent: 104,
            duration: 0.55,
            ease: "power3.inOut"
        }, "<");
}

function playVaultErrorAnimation() {
    const isLoveLetterVariant = document
        .querySelector(".container")
        ?.classList.contains("experiment-container-brown");

    if (!window.gsap) {
        return;
    }

    if (isLoveLetterVariant) {
        playLoveLetterErrorAnimation();
        return;
    }

    gsap.killTweensOf(".vault-lock, .lock-shackle");
    gsap.set(".lock-shackle", { rotation: 0, x: 0, y: 0, transformOrigin: "left bottom" });
    gsap.set(".vault-lock", { opacity: 1, scale: 1, rotation: 0 });

    gsap.timeline()
        .to(".vault-lock", {
            x: -5,
            rotation: -4,
            duration: 0.06,
            repeat: 5,
            yoyo: true,
            ease: "power1.inOut"
        })
        .set(".vault-lock", { x: 0, rotation: 0 });
}

function playLoveLetterErrorAnimation() {
    gsap.killTweensOf(".heart-sticker");
    gsap.set(".heart-sticker", {
        x: 0,
        y: 0,
        opacity: 1,
        scale: 1,
        rotation: -8,
        transformOrigin: "center center"
    });

    gsap.timeline()
        .to(".heart-sticker", {
            x: -5,
            rotation: -16,
            duration: 0.06,
            repeat: 5,
            yoyo: true,
            ease: "power1.inOut"
        })
        .set(".heart-sticker", { x: 0, rotation: -8 });
}

function playLoveLetterOpenAnimation() {
    gsap.timeline()
        .to(".heart-sticker", {
            rotation: 16,
            scale: 1.08,
            duration: 0.16,
            ease: "power1.out"
        })
        .to(".heart-sticker", {
            x: 64,
            y: -32,
            rotation: 42,
            opacity: 0,
            duration: 0.42,
            ease: "power3.in"
        })
        .to(".love-envelope-flap", {
            rotationX: 180,
            duration: 0.42,
            ease: "power2.inOut"
        }, "-=0.12")
        .to(".love-envelope-front", {
            yPercent: 108,
            opacity: 0,
            duration: 0.36,
            ease: "power2.inOut"
        }, "-=0.02")
        .to(".love-envelope-back, .love-envelope-flap", {
            opacity: 0,
            duration: 0.2,
            ease: "power1.out"
        }, "-=0.08");
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
