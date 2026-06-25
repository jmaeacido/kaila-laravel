const csrf = document.querySelector('meta[name="csrf-token"]')?.content || "";
const cfg = window.KAILA || {};
const tabPaths = {
    home: "/home",
    jobs: "/jobs",
    post: "/post",
    messages: "/messages",
    notifications: "/notifications",
    settings: "/settings",
};
const pathTabs = {
    "/": "home",
    "/home": "home",
    "/jobs": "jobs",
    "/post": "post",
    "/messages": "messages",
    "/notifications": "notifications",
    "/settings": "settings",
};
const authPaths = {
    login: "/login",
    register: "/register",
};
const socialAuthPendingPrefix = "kaila.socialAuth.";
const state = {
    user: cfg.user,
    data: null,
    socialAuthConfig: null,
    facebookSdkAppId: "",
    tab: pathTabs[window.location.pathname] || "home",
    activeRole: localStorage.getItem("kaila.activeRole") || "",
    selectedRequestId: null,
    jobFilter: "all",
    lastNotificationId: 0,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    }[char]));
}

async function api(url, options = {}) {
    const response = await fetch(url, {
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": csrf,
            ...(options.headers || {}),
        },
        credentials: "same-origin",
        ...options,
        body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = payload.message || payload.error || Object.values(payload.errors || {})?.[0]?.[0] || "Request failed.";
        throw new Error(message);
    }
    return payload;
}

function toast(message) {
    const host = $("[data-toasts]");
    if (!host) return;
    const item = document.createElement("div");
    item.className = "toast";
    item.textContent = message;
    host.appendChild(item);
    setTimeout(() => item.remove(), 3800);
}

function fillSelects() {
    $$("[data-category-options]").forEach((select) => {
        const current = select.value;
        select.innerHTML = `<option value="">Choose category</option>${(cfg.categories || []).map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}`;
        if (current) select.value = current;
    });
    $$("[data-urgency-options]").forEach((select) => {
        const current = select.value;
        select.innerHTML = (cfg.urgencies || []).map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
        if (current) select.value = current;
    });
}

function replaceUrl(path) {
    if (window.location.pathname !== path) {
        history.replaceState({ tab: pathTabs[path] || state.tab }, "", path);
    }
}

function pushUrl(path, payload = {}) {
    if (window.location.pathname !== path) {
        history.pushState(payload, "", path);
    }
}

function formData(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    $$('input[type="checkbox"]', form).forEach((input) => {
        data[input.name] = input.checked;
    });
    return data;
}

function bindPasswordToggles() {
    $$('input[type="password"]').forEach((input) => {
        const field = input.closest(".login-field, .register-field") || input.parentElement;
        if (!field || $("[data-password-toggle]", field)) return;
        const button = document.createElement("button");
        button.className = "password-toggle";
        button.type = "button";
        button.dataset.passwordToggle = "";
        button.setAttribute("aria-label", "Show password");
        button.setAttribute("title", "Show password");
        button.innerHTML = '<i class="bi bi-eye-slash"></i>';
        input.insertAdjacentElement("afterend", button);
    });

    document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-password-toggle]");
        if (!button) return;

        const field = button.closest(".login-field, .register-field, label, form");
        const input = field?.querySelector('input[type="password"], input[data-password-visible="true"]');
        if (!input) return;

        const shouldShow = input.type === "password";
        input.type = shouldShow ? "text" : "password";
        input.dataset.passwordVisible = shouldShow ? "true" : "false";
        button.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
        button.setAttribute("title", shouldShow ? "Hide password" : "Show password");
        const icon = $("i", button);
        if (icon) {
            icon.classList.toggle("bi-eye", shouldShow);
            icon.classList.toggle("bi-eye-slash", !shouldShow);
        }
    });
}

async function loadSocialAuthConfig() {
    try {
        state.socialAuthConfig = await api("/api/auth/config");
    } catch {
        state.socialAuthConfig = {};
    }
    renderSocialAuthButtons();
}

function renderSocialAuthButtons() {
    const config = state.socialAuthConfig || {};
    $$('[data-social-provider="google"]').forEach((button) => button.hidden = !config.googleClientId);
    $$('[data-social-provider="facebook"]').forEach((button) => button.hidden = !config.facebookAppId);
    $$("[data-social-auth]").forEach((row) => {
        const hasGoogle = Boolean(config.googleClientId);
        const hasFacebook = Boolean(config.facebookAppId);
        row.hidden = !(hasGoogle || hasFacebook);
    });
}

async function ensureSocialAuthConfig() {
    if (!state.socialAuthConfig) await loadSocialAuthConfig();
    return state.socialAuthConfig || {};
}

function socialAuthMessage(message) {
    const target = $("[data-auth-message]");
    if (target) target.textContent = message;
    else toast(message);
}

function loadScriptOnce(src, globalName) {
    if (globalName && window[globalName]) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const existing = $$("script").find((script) => script.src === src);
        if (existing) {
            existing.addEventListener("load", resolve, { once: true });
            existing.addEventListener("error", reject, { once: true });
            if (globalName && window[globalName]) resolve();
            return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error("Could not load the social sign-in script."));
        document.head.appendChild(script);
    });
}

function socialRedirectUri() {
    return `${window.location.origin}${window.location.pathname}`;
}

async function handleSocialAuth(provider, mode = "login") {
    const label = provider === "facebook" ? "Facebook" : "Google";
    try {
        await ensureSocialAuthConfig();
        if (provider === "google") {
            startGoogleRedirectAuth(mode);
            return;
        }
        if (provider === "facebook") {
            const token = await facebookAccessToken();
            await completeSocialAuthWithToken(provider, token, mode);
        }
    } catch (error) {
        socialAuthMessage(`${label} sign-in failed. ${error.message || "Please try again."}`);
    }
}

function startGoogleRedirectAuth(mode = "login") {
    const clientId = state.socialAuthConfig?.googleClientId;
    if (!clientId) throw new Error("Google login is not configured.");

    const marker = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(`${socialAuthPendingPrefix}${marker}`, JSON.stringify({
        provider: "google",
        mode,
        createdAt: Date.now(),
    }));

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", socialRedirectUri());
    url.searchParams.set("response_type", "token");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("prompt", "select_account");
    url.searchParams.set("state", marker);
    window.location.assign(url.toString());
}

async function handleGoogleRedirectResult() {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return false;

    const params = new URLSearchParams(hash);
    const marker = params.get("state") || "";
    const pendingKey = marker ? `${socialAuthPendingPrefix}${marker}` : "";
    const pending = pendingKey ? JSON.parse(sessionStorage.getItem(pendingKey) || "null") : null;
    if (pending?.provider !== "google") return false;

    sessionStorage.removeItem(pendingKey);
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);

    if (params.get("error")) {
        socialAuthMessage(params.get("error_description") || params.get("error") || "Google sign-in was cancelled.");
        return true;
    }

    const token = params.get("access_token");
    if (!token) {
        socialAuthMessage("Google did not return an access token.");
        return true;
    }

    await completeSocialAuthWithToken("google", token, pending.mode || "login");
    return true;
}

async function facebookAccessToken() {
    const appId = state.socialAuthConfig?.facebookAppId;
    if (!appId) throw new Error("Facebook login is not configured.");
    await ensureFacebookSdk(appId);

    return new Promise((resolve, reject) => {
        window.FB.login((response) => {
            if (response.authResponse?.accessToken) resolve(response.authResponse.accessToken);
            else reject(new Error("Facebook sign-in was cancelled."));
        }, { scope: "public_profile,email", auth_type: "rerequest", return_scopes: true });
    });
}

async function ensureFacebookSdk(appId) {
    await loadScriptOnce("https://connect.facebook.net/en_US/sdk.js", "FB");
    if (state.facebookSdkAppId === appId) return;
    window.FB.init({
        appId,
        cookie: false,
        status: false,
        xfbml: false,
        version: "v20.0",
    });
    state.facebookSdkAppId = appId;
}

async function completeSocialAuthWithToken(provider, token, mode = "login") {
    const body = { provider, token, mode };
    if (mode === "signup" || mode === "register") {
        const registerForm = $("[data-register-form]");
        if (registerForm) Object.assign(body, formData(registerForm));
        delete body.password;
    }

    const payload = await api("/api/auth/social", { method: "POST", body });
    if (!payload.user?.id) throw new Error("KAILA did not return an account session.");
    window.location.assign("/home");
}

async function initSocialAuth() {
    if (state.user) return;
    await loadSocialAuthConfig();
    await handleGoogleRedirectResult();
}

function setAuthMode(mode, options = {}) {
    if (!$("#login-form") && !$("#register-form")) return;

    $$("[data-auth-mode]").forEach((item) => item.classList.toggle("active", item.dataset.authMode === mode));
    const loginForm = $("#login-form");
    const registerForm = $("#register-form");
    if (loginForm) loginForm.hidden = mode !== "login";
    if (registerForm) registerForm.hidden = mode !== "register";
    const authMessage = $("[data-auth-message]");
    if (authMessage) authMessage.textContent = "";

    if (options.updateUrl !== false) {
        const path = authPaths[mode] || "/";
        options.replace ? replaceUrl(path) : pushUrl(path, { authMode: mode });
    }
}

function setRegisterStep(step, options = {}) {
    const registerForm = $("[data-register-form]");
    if (!registerForm) return;

    const nextStep = String(step);
    registerForm.dataset.step = nextStep;
    $$("[data-step-indicator]", registerForm).forEach((item) => {
        item.classList.toggle("is-active", item.dataset.stepIndicator === nextStep);
        item.classList.toggle("is-complete", Number(item.dataset.stepIndicator) < Number(nextStep));
    });

    if (options.updateUrl) {
        const path = nextStep === "2" ? "/register#step2" : "/register";
        options.replace ? history.replaceState({ registerStep: nextStep }, "", path) : history.pushState({ registerStep: nextStep }, "", path);
    }

    if (options.scrollToTop) {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

function bindAuth() {
    fillSelects();
    $$("[data-auth-mode]").forEach((button) => {
        button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
    });
    $$("[data-social-provider]").forEach((button) => {
        button.addEventListener("click", () => handleSocialAuth(button.dataset.socialProvider, button.dataset.socialMode || "login"));
    });

    const registerForm = $("[data-register-form]");
    if (registerForm) {
        const syncContactChannel = () => {
            const checked = $('input[name="contact_channel_card"]:checked', registerForm);
            const field = $('[name="preferred_contact_channel"]', registerForm);
            if (checked && field) field.value = checked.value;
        };
        const syncBestContactTime = () => {
            const checked = $('input[name="best_contact_time_choice"]:checked', registerForm);
            const field = $('[name="best_contact_time"]', registerForm);
            if (checked && field) field.value = checked.value;
        };

        if (window.location.hash === "#step2") setRegisterStep(2);
        $("[data-register-next]", registerForm)?.addEventListener("click", () => setRegisterStep(2, { updateUrl: true, scrollToTop: true }));
        $(".register-back")?.addEventListener("click", (event) => {
            if (registerForm.dataset.step !== "2") return;
            event.preventDefault();
            setRegisterStep(1, { updateUrl: true, replace: true, scrollToTop: true });
        });
        syncContactChannel();
        syncBestContactTime();

        $$(".choice-card input, .role-card input, .time-chip input", registerForm).forEach((input) => {
            input.addEventListener("change", () => {
                const group = input.name;
                $$(`input[name="${group}"]`, registerForm).forEach((item) => {
                    item.closest(".choice-card, .role-card, .time-chip")?.classList.toggle("is-selected", item.checked);
                });
                if (group === "contact_channel_card") {
                    const field = $('[name="preferred_contact_channel"]', registerForm);
                    if (field) field.value = input.value;
                }
                if (group === "best_contact_time_choice") {
                    const field = $('[name="best_contact_time"]', registerForm);
                    if (field) field.value = input.value;
                }
            });
        });
    }

    if (!state.user) {
        const initialMode = window.location.pathname === authPaths.register ? "register" : "login";
        setAuthMode(initialMode, { updateUrl: [authPaths.login, authPaths.register].includes(window.location.pathname), replace: true });
    }

    $("#login-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            await api("/auth/login", { method: "POST", body: formData(event.currentTarget) });
            window.location.assign("/home");
        } catch (error) {
            $("[data-auth-message]").textContent = error.message;
        }
    });

    $("#register-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            await api("/auth/register", { method: "POST", body: formData(event.currentTarget) });
            window.location.assign("/home");
        } catch (error) {
            $("[data-auth-message]").textContent = error.message;
        }
    });
}

function canActAsProvider() {
    return Boolean(state.data?.user?.provider_profile);
}

function activeRole() {
    if (!state.activeRole) state.activeRole = state.data?.user?.role === "provider" && canActAsProvider() ? "provider" : "client";
    if (state.activeRole === "provider" && !canActAsProvider()) state.activeRole = "client";
    localStorage.setItem("kaila.activeRole", state.activeRole);
    return state.activeRole;
}

async function refresh() {
    if (!state.user) return;
    state.data = await api("/api/state");
    state.user = state.data.user;
    render();
}

function setTab(tab, options = {}) {
    const nextTab = tabPaths[tab] ? tab : "home";
    if (state.user && options.updateUrl !== false) {
        const path = tabPaths[nextTab] || "/home";
        options.replace ? replaceUrl(path) : pushUrl(path, { tab: nextTab });
    }

    state.tab = nextTab;
    $$("[data-panel]").forEach((panel) => panel.hidden = panel.dataset.panel !== nextTab);
    $$("[data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === nextTab));
    $("#screen-title").textContent = {
        home: "Today on KAILA",
        jobs: "Jobs",
        post: "Post a request",
        messages: "Messages",
        notifications: "Notifications",
        settings: "Profile",
    }[nextTab] || "KAILA";
}

function statusClass(status) {
    if (["Payment Released", "Rated / Closed", "Resolved", "Accepted"].includes(status)) return "good";
    if (["Cancelled", "Disputed"].includes(status)) return "bad";
    if (["Countered", "Provider Marked Done", "Revision Requested"].includes(status)) return "warn";
    return "";
}

function isMine(request) {
    return request.client_id === state.user.id || request.accepted_provider_id === state.user.id;
}

function isAvailable(request) {
    return activeRole() === "provider"
        && !isMine(request)
        && ["Posted", "Offers Received", "Countered"].includes(request.status)
        && request.category === state.user.provider_profile?.category
        && !(request.offers || []).some((offer) => offer.provider_id === state.user.id);
}

function visibleRequests() {
    const items = state.data?.requests || [];
    return items.filter((request) => {
        if (state.jobFilter === "mine") return isMine(request);
        if (state.jobFilter === "available") return isAvailable(request);
        if (state.jobFilter === "active") return ["Accepted", "In Progress", "Provider Marked Done", "Revision Requested", "Disputed"].includes(request.status);
        if (state.jobFilter === "closed") return ["Payment Released", "Rated / Closed", "Cancelled", "Resolved"].includes(request.status);
        return true;
    });
}

function renderJobCard(request) {
    const offers = request.offers || [];
    const mineOffer = offers.find((offer) => offer.provider_id === state.user.id);
    const canOffer = isAvailable(request);
    const canAccept = request.client_id === state.user.id && ["Posted", "Offers Received", "Countered"].includes(request.status);
    const canChat = request.accepted_provider_id && (request.client_id === state.user.id || request.accepted_provider_id === state.user.id || state.user.role === "customer_service" || state.user.role === "admin");

    return `
        <article class="job-card" data-request-card="${request.id}">
            <div class="job-top">
                <div>
                    <p class="job-title">${escapeHtml(request.category)}</p>
                    <div class="job-meta">
                        <span>${escapeHtml(request.urgency)}</span>
                        <span>${escapeHtml(request.area)}</span>
                        <span>${escapeHtml(request.budget || "Open budget")}</span>
                    </div>
                </div>
                <span class="status ${statusClass(request.status)}">${escapeHtml(request.status)}</span>
            </div>
            <p class="job-body">${escapeHtml(request.details)}</p>
            ${request.accepted_provider ? `<div class="soft-label">Assigned to ${escapeHtml(request.accepted_provider.name)}</div>` : ""}
            ${offers.length ? `
                <div class="offer-box">
                    ${offers.map((offer) => `
                        <div class="offer-row">
                            <div><b>${escapeHtml(offer.provider?.name || "Provider")}</b><br><span class="soft-label">${escapeHtml(offer.schedule || "Schedule flexible")}</span></div>
                            <div><b>${escapeHtml(offer.amount)}</b><br><span class="soft-label">${escapeHtml(offer.status)}</span></div>
                            ${canAccept && offer.status !== "accepted" ? `<button class="primary" data-accept-offer="${offer.id}" data-request-id="${request.id}">Accept</button>` : ""}
                        </div>
                    `).join("")}
                </div>
            ` : `<div class="soft-label">No offers yet</div>`}
            ${canOffer ? `
                <form class="offer-form" data-offer-form="${request.id}">
                    <input name="amount" placeholder="Amount" required>
                    <input name="schedule" placeholder="When can you do it?">
                    <button class="primary" type="submit">${mineOffer ? "Counter" : "Offer"}</button>
                    <input name="notes" placeholder="Short note" class="wide">
                </form>
            ` : ""}
            <div class="job-actions">
                ${canChat ? `<button data-open-chat="${request.id}">Chat</button>` : ""}
                ${actionButtons(request)}
                ${!isMine(request) && activeRole() === "provider" ? `<button data-pass="${request.id}">Pass</button>` : ""}
                <button data-report-job="${request.id}">Report</button>
            </div>
        </article>
    `;
}

function actionButtons(request) {
    const buttons = [];
    const role = activeRole();
    if (role === "provider" && request.accepted_provider_id === state.user.id && request.status === "Accepted") buttons.push(["start", "Start"]);
    if (role === "provider" && request.accepted_provider_id === state.user.id && ["Accepted", "In Progress", "Revision Requested"].includes(request.status)) buttons.push(["provider_complete", "Mark done"]);
    if (request.client_id === state.user.id && request.status === "Provider Marked Done") buttons.push(["client_complete", "Confirm"]);
    if (request.client_id === state.user.id && request.status === "Provider Marked Done") buttons.push(["request_revision", "Revision"]);
    if (request.client_id === state.user.id && ["Posted", "Offers Received", "Countered", "Accepted"].includes(request.status)) buttons.push(["cancel", "Cancel"]);
    if ((isMine(request) || state.user.role === "customer_service") && ["Accepted", "In Progress", "Provider Marked Done", "Payment Released"].includes(request.status)) buttons.push(["dispute", "Dispute"]);
    if (isMine(request) && request.status === "Payment Released") buttons.push(["rate", "Rate"]);
    return buttons.map(([action, label]) => `<button data-job-action="${action}" data-request-id="${request.id}">${label}</button>`).join("");
}

function render() {
    if (!state.data) return;

    fillSelects();
    const role = activeRole();
    const toggle = $("[data-role-toggle]");
    if (toggle) {
        toggle.hidden = !canActAsProvider();
        toggle.textContent = role === "provider" ? "Provider mode" : "Client mode";
    }

    const unread = state.data.unreadNotifications || 0;
    const badge = $("[data-badge]");
    if (badge) {
        badge.hidden = unread === 0;
        badge.textContent = unread > 99 ? "99+" : unread;
    }

    $("[data-home-title]").textContent = role === "provider" ? "Jobs matching your skills" : "Get local help moving";
    $("[data-home-copy]").textContent = role === "provider" ? "Fresh requests in your category appear here with urgent notifications." : "Create a clear request, compare provider offers, and keep the job moving.";

    const requests = state.data.requests || [];
    const open = requests.filter((item) => ["Posted", "Offers Received", "Countered"].includes(item.status)).length;
    const active = requests.filter((item) => ["Accepted", "In Progress", "Provider Marked Done", "Revision Requested", "Disputed"].includes(item.status)).length;
    $("[data-metric='open']").textContent = open;
    $("[data-metric='offers']").textContent = requests.reduce((sum, item) => sum + (item.offers?.length || 0), 0);
    $("[data-metric='active']").textContent = active;
    $("[data-metric='unread']").textContent = unread;

    const homeItems = requests.filter((item) => role === "provider" ? isAvailable(item) || isMine(item) : item.client_id === state.user.id).slice(0, 5);
    $("[data-home-list]").innerHTML = homeItems.length ? homeItems.map(renderJobCard).join("") : empty("No jobs yet", role === "provider" ? "Save your provider profile to receive matching work." : "Post your first service request.");
    $("[data-job-list]").innerHTML = visibleRequests().length ? visibleRequests().map(renderJobCard).join("") : empty("Nothing in this view", "Try another filter or refresh.");

    renderThreads();
    renderNotifications();
    renderSettings();
    bindDynamicActions();
}

function empty(title, body) {
    return `<div class="notice-card"><b>${escapeHtml(title)}</b><p class="soft-label">${escapeHtml(body)}</p></div>`;
}

function renderThreads() {
    const threads = (state.data.requests || []).filter((request) => request.accepted_provider_id && isMine(request));
    $("[data-thread-list]").innerHTML = threads.length ? threads.map((request) => `
        <button class="thread ${state.selectedRequestId === request.id ? "active" : ""}" data-thread="${request.id}">
            <b>${escapeHtml(request.category)}</b><br>
            <span class="soft-label">${escapeHtml(request.status)} in ${escapeHtml(request.area)}</span>
        </button>
    `).join("") : empty("No active chats", "Chats open after a client accepts an offer.");
}

function renderNotifications() {
    const list = state.data.notifications || [];
    $("[data-notification-list]").innerHTML = list.length ? list.map((item) => `
        <div class="notice-card">
            <div class="job-top"><b>${escapeHtml(item.title)}</b><span class="status ${item.read_at ? "good" : "warn"}">${item.read_at ? "Read" : "New"}</span></div>
            <p>${escapeHtml(item.body || "")}</p>
            <span class="soft-label">${new Date(item.created_at).toLocaleString()}</span>
        </div>
    `).join("") : empty("No notifications", "KAILA alerts will land here.");
}

function renderSettings() {
    const profile = state.user.provider_profile || {};
    const form = $("#provider-form");
    if (form && !form.dataset.filled) {
        Object.entries(profile).forEach(([key, value]) => {
            const input = form.elements[key];
            if (!input || value === null) return;
            if (input.type === "checkbox") input.checked = Boolean(value);
            else input.value = value;
        });
        if (!form.elements.area.value) form.elements.area.value = state.user.area || "";
        if (!form.elements.category.value) form.elements.category.value = state.user.category || "";
        form.dataset.filled = "true";
    }

    const pushState = $("[data-push-state]");
    if (pushState) {
        const status = state.data.pushStatus;
        pushState.textContent = status.configured ? `${status.subscriptions} device(s)` : "Needs VAPID keys";
    }

    $("[data-feed-list]").innerHTML = (state.data.feed || []).map((post) => `
        <div class="feed-card"><b>${escapeHtml(post.author?.name || "KAILA user")}</b><p>${escapeHtml(post.body)}</p></div>
    `).join("") || empty("No feed posts", "Share provider availability or local service updates.");
}

function bindDynamicActions() {
    $$("[data-offer-form]").forEach((form) => {
        if (form.dataset.bound) return;
        form.dataset.bound = "true";
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const requestId = form.dataset.offerForm;
            try {
                await api(`/api/requests/${requestId}/offers`, { method: "POST", body: { ...formData(form), type: "offer" } });
                form.reset();
                await refresh();
                toast("Offer sent.");
            } catch (error) { toast(error.message); }
        });
    });

    $$("[data-accept-offer]").forEach((button) => button.onclick = async () => {
        try {
            await api(`/api/requests/${button.dataset.requestId}/offers/${button.dataset.acceptOffer}/accept`, { method: "POST", body: {} });
            await refresh();
            toast("Provider accepted.");
        } catch (error) { toast(error.message); }
    });

    $$("[data-job-action]").forEach((button) => button.onclick = async () => {
        const action = button.dataset.jobAction;
        const body = { action };
        if (["provider_complete", "request_revision", "dispute", "rate"].includes(action)) {
            const note = prompt(action === "rate" ? "Rating note" : "Add a note") || "";
            body.note = note;
            body.proof_note = note;
            body.revision_note = note;
            body.dispute_note = note;
            if (action === "rate") body.score = Number(prompt("Score 1-5", "5") || 5);
        }
        try {
            await api(`/api/requests/${button.dataset.requestId}/action`, { method: "POST", body });
            await refresh();
            toast("Job updated.");
        } catch (error) { toast(error.message); }
    });

    $$("[data-open-chat]").forEach((button) => button.onclick = async () => {
        state.selectedRequestId = Number(button.dataset.openChat);
        setTab("messages");
        await loadMessages();
        render();
    });

    $$("[data-thread]").forEach((button) => button.onclick = async () => {
        state.selectedRequestId = Number(button.dataset.thread);
        await loadMessages();
        render();
    });

    $$("[data-pass]").forEach((button) => button.onclick = async () => {
        try {
            await api(`/api/requests/${button.dataset.pass}/pass`, { method: "POST", body: {} });
            await refresh();
        } catch (error) { toast(error.message); }
    });

    $$("[data-report-job]").forEach((button) => button.onclick = async () => {
        const reason = prompt("Why report this job?");
        if (!reason) return;
        try {
            await api("/api/reports", { method: "POST", body: { type: "job", service_request_id: button.dataset.reportJob, reason } });
            toast("Report sent to support.");
        } catch (error) { toast(error.message); }
    });
}

async function loadMessages() {
    if (!state.selectedRequestId) return;
    const payload = await api(`/api/requests/${state.selectedRequestId}/messages`);
    const request = (state.data.requests || []).find((item) => item.id === state.selectedRequestId);
    $("[data-message-context]").textContent = request ? `${request.category} - ${request.status}` : "Job chat";
    $("[data-messages]").innerHTML = payload.messages.map((message) => `
        <div class="message ${message.sender_id === state.user.id ? "mine" : ""}">
            ${escapeHtml(message.body)}
            <small>${escapeHtml(message.sender?.name || "User")} - ${new Date(message.created_at).toLocaleString()}</small>
        </div>
    `).join("") || empty("No messages yet", "Send the first update.");
}

function bindApp() {
    fillSelects();
    $$("[data-tab]").forEach((button) => button.addEventListener("click", () => setTab(button.dataset.tab)));
    $$("[data-tab-jump]").forEach((button) => button.addEventListener("click", () => setTab(button.dataset.tabJump)));
    $("[data-refresh]")?.addEventListener("click", () => refresh().catch((error) => toast(error.message)));
    $("[data-role-toggle]")?.addEventListener("click", () => {
        state.activeRole = activeRole() === "provider" ? "client" : "provider";
        render();
    });
    $("[data-job-filter]")?.addEventListener("change", (event) => {
        state.jobFilter = event.target.value;
        render();
    });
    $("[data-logout]")?.addEventListener("click", async () => {
        await api("/auth/logout", { method: "POST", body: {} });
        window.location.assign("/login");
    });
    $("[data-mark-read]")?.addEventListener("click", async () => {
        await api("/api/notifications/read", { method: "POST", body: {} });
        await refresh();
    });

    $("#request-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            await api("/api/requests", { method: "POST", body: formData(event.currentTarget) });
            event.currentTarget.reset();
            setTab("jobs");
            await refresh();
            toast("Request posted. Matching providers were notified.");
        } catch (error) { toast(error.message); }
    });

    $("#provider-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            await api("/api/providers", { method: "POST", body: formData(event.currentTarget) });
            event.currentTarget.dataset.filled = "";
            state.activeRole = "provider";
            await refresh();
            toast("Provider profile saved.");
        } catch (error) { toast(error.message); }
    });

    $("#message-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!state.selectedRequestId) return toast("Select a job chat first.");
        const data = formData(event.currentTarget);
        if (!data.body) return;
        try {
            await api(`/api/requests/${state.selectedRequestId}/messages`, { method: "POST", body: data });
            event.currentTarget.reset();
            await loadMessages();
        } catch (error) { toast(error.message); }
    });

    $("#feed-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            await api("/api/feed", { method: "POST", body: formData(event.currentTarget) });
            event.currentTarget.reset();
            await refresh();
        } catch (error) { toast(error.message); }
    });

    $("[data-enable-push]")?.addEventListener("click", enablePush);
}

function startSse() {
    if (!state.user || !window.EventSource) return;
    const source = new EventSource(`/stream?last_id=${state.lastNotificationId}`);
    source.addEventListener("kaila.notification", async (event) => {
        const item = JSON.parse(event.data);
        state.lastNotificationId = Math.max(state.lastNotificationId, Number(item.id || 0));
        toast(item.title || "KAILA update");
        await refresh();
    });
    source.onerror = () => {
        source.close();
        setTimeout(startSse, 5000);
    };
}

function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

async function enablePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return toast("This browser does not support Web Push.");
    }
    if (!cfg.vapidPublicKey) {
        return toast("Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to enable push sending.");
    }

    const registration = await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return toast("Notification permission was not granted.");

    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(cfg.vapidPublicKey),
    });

    await api("/api/push-subscriptions", { method: "POST", body: subscription.toJSON() });
    await refresh();
    toast("Push notifications enabled.");
}

async function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
        await navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
}

window.addEventListener("popstate", () => {
    if (!state.user) {
        const mode = window.location.pathname === authPaths.register ? "register" : "login";
        setAuthMode(mode, { updateUrl: false });
        if (mode === "register") {
            setRegisterStep(window.location.hash === "#step2" ? 2 : 1);
        }
        return;
    }

    setTab(pathTabs[window.location.pathname] || "home", { updateUrl: false });
});

bindAuth();
bindApp();
bindPasswordToggles();
initSocialAuth().catch((error) => socialAuthMessage(error.message || "Social sign-in could not be initialized."));
registerServiceWorker();
if (state.user) {
    refresh().then(() => {
        setTab(pathTabs[window.location.pathname] || "home", { replace: true });
        startSse();
        setInterval(refresh, 20000);
    }).catch((error) => toast(error.message));
}
