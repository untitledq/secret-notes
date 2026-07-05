const API_BASE = "http://localhost:3000";
const TEST_GROUP_UI_FLAG = "test-group-ui-flag";
const CREATE_VAULT_SELECTOR = "#createNoteVault";
const LOAD_VAULT_SELECTOR = "#loadNoteVault";

// --- health check on startup ---
window.addEventListener("DOMContentLoaded", async () => {
    setupTabs();
    startBackgroundIconAnimation();
    applyTestGroupUIExperiment();
    try {
        const res = await fetch(`${API_BASE}/health`);
        const data = await res.json();

        if (!res.ok) {
            showOutput(`Health check failed: ${data.error || res.status}`);
            return;
        }

        showOutput(`Backend OK: ${data.status}`);
    } catch {
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
        playEncryptCloseAnimation();
    } catch {
        showOutput("Network error while saving");
    }
}

async function loadNote() {
    const id = document.getElementById("loadNoteId").value;
    const passphrase = document.getElementById("loadKey").value;
    const noteContent = document.getElementById("loadNoteContent");

    resetVaultAnimation(LOAD_VAULT_SELECTOR, true);

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
    } catch {
        playVaultErrorAnimation();
        showOutput("Network error while loading");
    }
}

function showOutput(msg) {
    document.getElementById("output").textContent = msg;
}

function startBackgroundIconAnimation() {
    alignBackgroundIconRows();
    const iconPath = getBackgroundIconPath();
    const rows = [
        { selector: ".icon-escalator-a", duration: 24, delay: 0 },
        { selector: ".icon-escalator-b", duration: 24, delay: -8 }
    ];

    rows.forEach(({ selector, duration, delay }) => {
        const row = document.querySelector(selector);

        if (!row) {
            return;
        }

        fillIconRow(row, iconPath);

        if (!window.gsap) {
            row.style.animation = `iconEscalatorFallback ${duration}s linear infinite`;
            return;
        }

        const loopWidth = row.querySelector(".icon-loop")?.offsetWidth || 0;

        if (!loopWidth) {
            return;
        }

        gsap.set(row, {
            x: 0
        });

        gsap.to(row, {
            x: -loopWidth,
            duration,
            ease: "none",
            repeat: -1,
            delay
        });
    });
}

function alignBackgroundIconRows() {
    const title = document.querySelector("h1");
    const output = document.getElementById("output");
    const topRow = document.querySelector(".icon-escalator-a");
    const bottomRow = document.querySelector(".icon-escalator-b");

    if (title && topRow) {
        const titleRect = title.getBoundingClientRect();
        topRow.style.top = `${titleRect.top + titleRect.height / 2 - 18}px`;
    }

    if (output && bottomRow) {
        const outputRect = output.getBoundingClientRect();
        bottomRow.style.top = `${outputRect.top + outputRect.height / 2 - 18}px`;
    }
}

function getBackgroundIconPath() {
    const isLoveLetterVariant = document
        .querySelector(".container")
        ?.classList.contains("experiment-container-brown");

    return isLoveLetterVariant
        ? "vendor/icons/heart.svg"
        : "vendor/icons/search.svg";
}

function refreshBackgroundIcons() {
    document.querySelectorAll(".icon-escalator").forEach((row) => {
        fillIconRow(row, getBackgroundIconPath());
    });
}

function fillIconRow(row, iconPath) {
    const iconSpacing = 82;
    const iconCount = Math.ceil(window.innerWidth / iconSpacing) + 4;
    const loop = document.createElement("div");

    loop.className = "icon-loop";

    for (let i = 0; i < iconCount; i += 1) {
        const icon = document.createElement("img");
        icon.src = iconPath;
        icon.alt = "";
        loop.appendChild(icon);
    }

    row.replaceChildren(loop, loop.cloneNode(true));
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

    const createNote = document.getElementById("createNote");

    if (createNote) {
        createNote.addEventListener("input", resetEncryptVaultAnimation);
    }
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
        resetVaultAnimation(LOAD_VAULT_SELECTOR, true);
    } else {
        resetEncryptVaultAnimation();
    }
}

function vaultPart(vaultSelector, partSelector) {
    return `${vaultSelector} ${partSelector}`;
}

function resetVaultAnimation(vaultSelector, showOverlay) {
    const vault = document.querySelector(vaultSelector);
    const overlay = document.querySelector(vaultPart(vaultSelector, ".vault-overlay"));

    if (vault) {
        vault.classList.add("is-locked");
    }

    if (overlay) {
        overlay.style.display = showOverlay ? "" : "none";
    }

    if (!window.gsap) {
        return;
    }

    gsap.killTweensOf([
        vaultPart(vaultSelector, ".vault-door-left"),
        vaultPart(vaultSelector, ".vault-door-right"),
        vaultPart(vaultSelector, ".vault-line"),
        vaultPart(vaultSelector, ".vault-lock"),
        vaultPart(vaultSelector, ".lock-shackle"),
        vaultPart(vaultSelector, ".heart-sticker"),
        vaultPart(vaultSelector, ".love-envelope-back"),
        vaultPart(vaultSelector, ".love-envelope-flap"),
        vaultPart(vaultSelector, ".love-envelope-front")
    ]);
    gsap.set(vaultPart(vaultSelector, ".vault-door-left"), { xPercent: 0 });
    gsap.set(vaultPart(vaultSelector, ".vault-door-right"), { xPercent: 0 });
    gsap.set(vaultPart(vaultSelector, ".vault-line"), { scaleY: 1, opacity: 1, transformOrigin: "center center" });
    gsap.set(vaultPart(vaultSelector, ".vault-lock"), { opacity: 1, scale: 1, rotation: 0 });
    gsap.set(vaultPart(vaultSelector, ".lock-shackle"), { rotation: 0, x: 0, y: 0, transformOrigin: "left bottom" });
    gsap.set(vaultPart(vaultSelector, ".heart-sticker"), {
        x: 0,
        y: 0,
        opacity: 1,
        scale: 1,
        rotation: -8,
        transformOrigin: "center center"
    });
    gsap.set(vaultPart(vaultSelector, ".love-envelope-back"), { opacity: 1, yPercent: 0 });
    gsap.set(vaultPart(vaultSelector, ".love-envelope-flap"), {
        opacity: 1,
        rotationX: 0,
        yPercent: 0,
        transformOrigin: "top center",
        transformPerspective: 420
    });
    gsap.set(vaultPart(vaultSelector, ".love-envelope-front"), { opacity: 1, yPercent: 0 });
}

function resetEncryptVaultAnimation() {
    resetVaultAnimation(CREATE_VAULT_SELECTOR, false);
}

function finishEncryptAnimation() {
    window.setTimeout(() => {
        const overlay = document.querySelector(vaultPart(CREATE_VAULT_SELECTOR, ".vault-overlay"));
        const clearCreateFields = () => {
            document.getElementById("createNote").value = "";
            document.getElementById("createKey").value = "";
            resetEncryptVaultAnimation();
        };

        if (!window.gsap || !overlay) {
            clearCreateFields();
            return;
        }

        gsap.to(overlay, {
            opacity: 0,
            duration: 0.35,
            ease: "power1.out",
            onComplete: () => {
                clearCreateFields();
                gsap.set(overlay, { opacity: 1 });
            }
        });
    }, 1500);
}

function playVaultOpenAnimation() {
    const vault = document.querySelector(LOAD_VAULT_SELECTOR);
    const isLoveLetterVariant = document
        .querySelector(".container")
        ?.classList.contains("experiment-container-brown");

    if (vault) {
        vault.classList.remove("is-locked");
    }

    if (!window.gsap) {
        const overlay = document.querySelector(vaultPart(LOAD_VAULT_SELECTOR, ".vault-overlay"));

        if (overlay) {
            overlay.style.display = "none";
        }

        return;
    }

    if (isLoveLetterVariant) {
        playLoveLetterOpenAnimation(LOAD_VAULT_SELECTOR);
        return;
    }

    gsap.timeline()
        .to(vaultPart(LOAD_VAULT_SELECTOR, ".lock-shackle"), {
            rotation: 32,
            x: 5,
            y: -3,
            duration: 0.28,
            ease: "back.out(1.8)"
        })
        .to(vaultPart(LOAD_VAULT_SELECTOR, ".vault-lock"), {
            scale: 0.92,
            opacity: 0,
            duration: 0.2,
            ease: "power1.out"
        }, "+=0.06")
        .to(vaultPart(LOAD_VAULT_SELECTOR, ".vault-line"), {
            scaleY: 0,
            opacity: 0,
            duration: 0.22,
            ease: "power2.inOut"
        }, "-=0.08")
        .to(vaultPart(LOAD_VAULT_SELECTOR, ".vault-door-left"), {
            xPercent: -104,
            duration: 0.55,
            ease: "power3.inOut"
        }, "-=0.02")
        .to(vaultPart(LOAD_VAULT_SELECTOR, ".vault-door-right"), {
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
        playLoveLetterErrorAnimation(LOAD_VAULT_SELECTOR);
        return;
    }

    gsap.killTweensOf([vaultPart(LOAD_VAULT_SELECTOR, ".vault-lock"), vaultPart(LOAD_VAULT_SELECTOR, ".lock-shackle")]);
    gsap.set(vaultPart(LOAD_VAULT_SELECTOR, ".lock-shackle"), { rotation: 0, x: 0, y: 0, transformOrigin: "left bottom" });
    gsap.set(vaultPart(LOAD_VAULT_SELECTOR, ".vault-lock"), { opacity: 1, scale: 1, rotation: 0 });

    gsap.timeline()
        .to(vaultPart(LOAD_VAULT_SELECTOR, ".vault-lock"), {
            x: -5,
            rotation: -4,
            duration: 0.06,
            repeat: 5,
            yoyo: true,
            ease: "power1.inOut"
        })
        .set(vaultPart(LOAD_VAULT_SELECTOR, ".vault-lock"), { x: 0, rotation: 0 });
}

function playLoveLetterErrorAnimation(vaultSelector) {
    gsap.killTweensOf(vaultPart(vaultSelector, ".heart-sticker"));
    gsap.set(vaultPart(vaultSelector, ".heart-sticker"), {
        x: 0,
        y: 0,
        opacity: 1,
        scale: 1,
        rotation: -8,
        transformOrigin: "center center"
    });

    gsap.timeline()
        .to(vaultPart(vaultSelector, ".heart-sticker"), {
            x: -5,
            rotation: -16,
            duration: 0.06,
            repeat: 5,
            yoyo: true,
            ease: "power1.inOut"
        })
        .set(vaultPart(vaultSelector, ".heart-sticker"), { x: 0, rotation: -8 });
}

function playLoveLetterOpenAnimation(vaultSelector) {
    gsap.timeline()
        .to(vaultPart(vaultSelector, ".heart-sticker"), {
            rotation: 16,
            scale: 1.08,
            duration: 0.16,
            ease: "power1.out"
        })
        .to(vaultPart(vaultSelector, ".heart-sticker"), {
            x: 64,
            y: -32,
            rotation: 42,
            opacity: 0,
            duration: 0.42,
            ease: "power3.in"
        })
        .to(vaultPart(vaultSelector, ".love-envelope-flap"), {
            rotationX: 180,
            duration: 0.42,
            ease: "power2.inOut"
        }, "-=0.12")
        .to(vaultPart(vaultSelector, ".love-envelope-front"), {
            yPercent: 108,
            opacity: 0,
            duration: 0.36,
            ease: "power2.inOut"
        }, "-=0.02")
        .to([vaultPart(vaultSelector, ".love-envelope-back"), vaultPart(vaultSelector, ".love-envelope-flap")], {
            opacity: 0,
            duration: 0.2,
            ease: "power1.out"
        }, "-=0.08");
}

function playEncryptCloseAnimation() {
    const overlay = document.querySelector(vaultPart(CREATE_VAULT_SELECTOR, ".vault-overlay"));
    const isLoveLetterVariant = document
        .querySelector(".container")
        ?.classList.contains("experiment-container-brown");

    if (overlay) {
        overlay.style.display = "block";
    }

    if (!window.gsap) {
        return;
    }

    if (isLoveLetterVariant) {
        playLoveLetterCloseAnimation(CREATE_VAULT_SELECTOR);
        return;
    }

    gsap.killTweensOf([
        vaultPart(CREATE_VAULT_SELECTOR, ".vault-door-left"),
        vaultPart(CREATE_VAULT_SELECTOR, ".vault-door-right"),
        vaultPart(CREATE_VAULT_SELECTOR, ".vault-line"),
        vaultPart(CREATE_VAULT_SELECTOR, ".vault-lock"),
        vaultPart(CREATE_VAULT_SELECTOR, ".lock-shackle")
    ]);
    gsap.set(vaultPart(CREATE_VAULT_SELECTOR, ".vault-door-left"), { xPercent: -104 });
    gsap.set(vaultPart(CREATE_VAULT_SELECTOR, ".vault-door-right"), { xPercent: 104 });
    gsap.set(vaultPart(CREATE_VAULT_SELECTOR, ".vault-line"), { scaleY: 0, opacity: 0, transformOrigin: "center center" });
    gsap.set(vaultPart(CREATE_VAULT_SELECTOR, ".vault-lock"), { opacity: 1, scale: 0.95, rotation: 0 });
    gsap.set(vaultPart(CREATE_VAULT_SELECTOR, ".lock-shackle"), {
        rotation: 32,
        x: 5,
        y: -3,
        transformOrigin: "left bottom"
    });

    gsap.timeline()
        .to(vaultPart(CREATE_VAULT_SELECTOR, ".vault-door-left"), {
            xPercent: 0,
            duration: 0.5,
            ease: "power3.inOut"
        })
        .to(vaultPart(CREATE_VAULT_SELECTOR, ".vault-door-right"), {
            xPercent: 0,
            duration: 0.5,
            ease: "power3.inOut"
        }, "<")
        .to(vaultPart(CREATE_VAULT_SELECTOR, ".vault-line"), {
            scaleY: 1,
            opacity: 1,
            duration: 0.2,
            ease: "power2.inOut"
        }, "-=0.08")
        .to(vaultPart(CREATE_VAULT_SELECTOR, ".lock-shackle"), {
            rotation: 0,
            x: 0,
            y: 0,
            duration: 0.28,
            ease: "back.out(1.8)"
        }, "-=0.02")
        .to(vaultPart(CREATE_VAULT_SELECTOR, ".vault-lock"), {
            scale: 1,
            duration: 0.16,
            ease: "power1.out"
        }, "<")
        .call(finishEncryptAnimation);
}

function playLoveLetterCloseAnimation(vaultSelector) {
    gsap.killTweensOf([
        vaultPart(vaultSelector, ".love-envelope-back"),
        vaultPart(vaultSelector, ".love-envelope-flap"),
        vaultPart(vaultSelector, ".love-envelope-front"),
        vaultPart(vaultSelector, ".heart-sticker")
    ]);
    gsap.set(vaultPart(vaultSelector, ".love-envelope-back"), { opacity: 1, yPercent: 0 });
    gsap.set(vaultPart(vaultSelector, ".love-envelope-flap"), {
        opacity: 1,
        rotationX: 180,
        transformOrigin: "top center",
        transformPerspective: 420
    });
    gsap.set(vaultPart(vaultSelector, ".love-envelope-front"), { opacity: 0, yPercent: 108 });
    gsap.set(vaultPart(vaultSelector, ".heart-sticker"), {
        x: 0,
        y: 0,
        opacity: 0,
        scale: 0.6,
        rotation: -8,
        transformOrigin: "center center"
    });

    gsap.timeline()
        .to(vaultPart(vaultSelector, ".love-envelope-front"), {
            yPercent: 0,
            opacity: 1,
            duration: 0.34,
            ease: "power2.inOut"
        })
        .to(vaultPart(vaultSelector, ".love-envelope-flap"), {
            rotationX: 0,
            duration: 0.4,
            ease: "power2.inOut"
        }, "-=0.05")
        .to(vaultPart(vaultSelector, ".heart-sticker"), {
            opacity: 1,
            scale: 1,
            duration: 0.2,
            ease: "back.out(2)"
        }, "-=0.04")
        .call(() => {
            if (vaultSelector === CREATE_VAULT_SELECTOR) {
                finishEncryptAnimation();
            }
        });
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
        refreshBackgroundIcons();
    });
}

if (typeof window !== "undefined") {
    window.saveNote = saveNote;
    window.loadNote = loadNote;
    window.SecretNotes = {
        applyTestGroupUIExperiment,
        fillIconRow,
        refreshBackgroundIcons,
        resetEncryptVaultAnimation,
        resetVaultAnimation,
        safeJson,
        setActiveTab,
        setupTabs,
        showOutput
    };
}
