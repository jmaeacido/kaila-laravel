import { logout, onStoreChange, refreshState, store, formatCountBadge, navBadgeFor } from "./kaila-api.js";
import { sidebarPromoCards, sidebarQuickLinks, sidebarTrustCard } from "./kaila-mock-ui.js";

export { store, refreshState } from "./kaila-api.js";
export * from "./kaila-api.js";

export function icon(name, extra = "") {
    if (name.startsWith("fa-")) {
        return `<i class="fa-solid ${name} ${extra}" aria-hidden="true"></i>`;
    }
    if (name.startsWith("bi ")) {
        const faMap = {
            "bi-house-door": "fa-house",
            "bi-arrow-repeat": "fa-rotate",
            "bi-exclamation-triangle": "fa-triangle-exclamation",
            "bi-bell": "fa-bell",
            "bi-chevron-down": "fa-chevron-down",
            "bi-chevron-right": "fa-chevron-right",
            "bi-chat-dots-fill": "fa-comment-dots",
        };
        const key = name.replace("bi ", "bi-");
        const fa = faMap[key] || "fa-circle";
        return `<i class="fa-solid ${fa} ${extra}" aria-hidden="true"></i>`;
    }
    return `<i class="fa-solid ${name} ${extra}" aria-hidden="true"></i>`;
}

export function avatar(name, size = "", photo = "") {
    if (photo) {
        return `<img class="kaila-avatar kaila-avatar--photo ${size}" src="${photo}" alt="">`;
    }
    const initials = String(name || "K")
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    return `<span class="kaila-avatar ${size}">${initials}</span>`;
}

export function pill(label, tone = "blue") {
    return `<span class="kaila-pill kaila-pill--${tone}">${label}</span>`;
}

export function card(body, extra = "") {
    return `<div class="kaila-card ${extra}">${body}</div>`;
}

export function sectionHead(title, action = "") {
    return `<div class="kaila-section-head"><h2>${title}</h2>${action}</div>`;
}

export function toast(message) {
    let host = document.querySelector(".kaila-toast-host");
    if (!host) {
        host = document.createElement("div");
        host.className = "kaila-toast-host";
        document.body.appendChild(host);
    }
    const node = document.createElement("div");
    node.className = "kaila-toast";
    node.textContent = message;
    host.appendChild(node);
    setTimeout(() => node.remove(), 3200);
}

function closeKailaModal(backdrop, value) {
    backdrop.classList.add("is-closing");
    setTimeout(() => backdrop.remove(), 150);
    return value;
}

export function kailaConfirm({
    title = "Confirm action",
    message = "",
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    tone = "primary",
} = {}) {
    return new Promise((resolve) => {
        const backdrop = document.createElement("div");
        backdrop.className = "kaila-modal-backdrop";
        backdrop.innerHTML = `
            <div class="kaila-modal" role="dialog" aria-modal="true" aria-labelledby="kaila-modal-title">
                <header class="kaila-modal__head">
                    <div>
                        <span class="kaila-modal__eyebrow">KAILA</span>
                        <strong id="kaila-modal-title">${escapeHtml(title)}</strong>
                    </div>
                    <button class="kaila-modal__close" type="button" data-kaila-modal-cancel aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
                </header>
                ${message ? `<p class="kaila-modal__message">${escapeHtml(message)}</p>` : ""}
                <div class="kaila-modal__actions">
                    <button class="btn btn-light" type="button" data-kaila-modal-cancel>${escapeHtml(cancelLabel)}</button>
                    <button class="btn btn-${tone === "danger" ? "danger" : "primary"}" type="button" data-kaila-modal-confirm>${escapeHtml(confirmLabel)}</button>
                </div>
            </div>`;
        document.body.appendChild(backdrop);

        const finish = (value) => resolve(closeKailaModal(backdrop, value));
        backdrop.querySelectorAll("[data-kaila-modal-cancel]").forEach((button) => {
            button.addEventListener("click", () => finish(false));
        });
        backdrop.querySelector("[data-kaila-modal-confirm]")?.addEventListener("click", () => finish(true));
        backdrop.addEventListener("click", (event) => {
            if (event.target === backdrop) finish(false);
        });
    });
}

export function kailaPrompt({
    title = "Enter details",
    message = "",
    defaultValue = "",
    placeholder = "",
    multiline = false,
    confirmLabel = "Save",
    cancelLabel = "Cancel",
    required = true,
} = {}) {
    return new Promise((resolve) => {
        const backdrop = document.createElement("div");
        backdrop.className = "kaila-modal-backdrop";
        const field = multiline
            ? `<textarea class="kaila-modal__input" data-kaila-modal-input rows="4" placeholder="${escapeHtml(placeholder)}">${escapeHtml(defaultValue)}</textarea>`
            : `<input class="kaila-modal__input" data-kaila-modal-input type="text" value="${escapeHtml(defaultValue)}" placeholder="${escapeHtml(placeholder)}">`;

        backdrop.innerHTML = `
            <div class="kaila-modal" role="dialog" aria-modal="true" aria-labelledby="kaila-modal-title">
                <header class="kaila-modal__head">
                    <div>
                        <span class="kaila-modal__eyebrow">KAILA</span>
                        <strong id="kaila-modal-title">${escapeHtml(title)}</strong>
                    </div>
                    <button class="kaila-modal__close" type="button" data-kaila-modal-cancel aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
                </header>
                ${message ? `<p class="kaila-modal__message">${escapeHtml(message)}</p>` : ""}
                <label class="kaila-modal__field">${field}</label>
                <div class="kaila-modal__actions">
                    <button class="btn btn-light" type="button" data-kaila-modal-cancel>${escapeHtml(cancelLabel)}</button>
                    <button class="btn btn-primary" type="button" data-kaila-modal-confirm>${escapeHtml(confirmLabel)}</button>
                </div>
            </div>`;
        document.body.appendChild(backdrop);

        const input = backdrop.querySelector("[data-kaila-modal-input]");
        input?.focus();

        const finish = (value) => resolve(closeKailaModal(backdrop, value));
        const submit = () => {
            const value = input?.value?.trim() || "";
            if (required && !value) {
                input?.focus();
                return;
            }
            finish(value || null);
        };

        backdrop.querySelectorAll("[data-kaila-modal-cancel]").forEach((button) => {
            button.addEventListener("click", () => finish(null));
        });
        backdrop.querySelector("[data-kaila-modal-confirm]")?.addEventListener("click", submit);
        input?.addEventListener("keydown", (event) => {
            if (event.key === "Enter" && !multiline) {
                event.preventDefault();
                submit();
            }
        });
        backdrop.addEventListener("click", (event) => {
            if (event.target === backdrop) finish(null);
        });
    });
}

export function firstName(name) {
    return String(name || "there").split(" ")[0];
}

export function greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}

export function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    }[char]));
}

export function loadingScreen(message = "Loading your KAILA workspace...") {
    return `<div class="kaila-empty">${icon("fa-rotate")} ${escapeHtml(message)}</div>`;
}

export function errorScreen(message) {
    return `<div class="kaila-empty">${icon("fa-triangle-exclamation")} ${escapeHtml(message)}</div>`;
}

export function formatRoleLabel(roleValue = "") {
    if (store.admin?.permissions?.isSuperAdmin && roleValue === "admin") {
        return "Super Admin";
    }

    const labels = {
        customer_service: "Customer Service",
        admin: "Admin",
        ops: "Ops",
        client: "Client",
        provider: "Provider",
    };

    return labels[roleValue] || String(roleValue || "User")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function topbarDisplayName() {
    return store.user?.name || "KAILA User";
}

function topbarMenuItems(screens = {}) {
    const screenKeys = new Set(Object.keys(screens));
    const items = [];

    if (screenKeys.has("settings")) {
        items.push({ view: "settings", icon: "fa-user-gear", label: "Profile & Settings" });
    }

    const activityView = ["notifications", "activity"].find((view) => screenKeys.has(view));
    if (activityView) {
        items.push({ view: activityView, icon: "fa-bell", label: "Activity" });
    }

    const supportView = ["support", "inbox"].find((view) => screenKeys.has(view));
    if (supportView && ["client", "provider", "admin", "customer_service"].includes(store.user?.role)) {
        items.push({ view: supportView, icon: "fa-headset", label: supportView === "inbox" ? "Support Desk" : "Support" });
    }

    return items;
}

export function createApp(options) {
    const {
        rootId = "marketplace-app",
        navItems,
        routeViews,
        screens,
        bottomNav,
        sidebarExtras = "",
        sidebarPostButton = true,
        sidebarPromos = false,
        role = "client",
        topbarSearch = false,
        fabView = "support",
        fabIcon = "fa-comment-dots",
        getTitle,
        getSubtitle,
        bindScreenActions,
        storeActions,
    } = options;

    let activeView = currentView();

    function currentView() {
        const hash = window.location.hash.replace("#", "");
        if (navItems.some(([id]) => id === hash)) return hash;
        return routeViews[window.location.pathname] || navItems[0][0];
    }

    function screenTitle() {
        if (typeof getTitle === "function") {
            const custom = getTitle(activeView);
            if (custom !== undefined && custom !== null) return custom;
        }
        return navItems.find(([id]) => id === viewLabel(activeView))?.[1] || "KAILA";
    }

    function showTopbarHeading() {
        return activeView !== "home" && Boolean(screenTitle()) && Boolean(screenSubtitle() || screenTitle());
    }

    function screenSubtitle() {
        return getSubtitle?.(activeView) || "";
    }

    function viewLabel(view) {
        return view;
    }

    function navigate(view) {
        activeView = view;
        const item = navItems.find(([id]) => id === view);
        if (item) history.pushState({ view }, "", item[3]);
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function bindLinks() {
        document.querySelectorAll("[data-view-link]").forEach((button) => {
            button.addEventListener("click", (event) => {
                event.preventDefault();
                navigate(button.dataset.viewLink);
            });
        });
        document.querySelectorAll("[data-select-request]").forEach((button) => {
            button.addEventListener("click", (event) => {
                event.preventDefault();
                storeActions?.selectRequest?.(button.dataset.selectRequest);
                if (button.dataset.viewLink) navigate(button.dataset.viewLink);
            });
        });
    }

    function bindActions() {
        document.querySelectorAll("[data-toast]").forEach((button) => {
            button.addEventListener("click", () => toast(button.dataset.toast));
        });
        document.querySelector("[data-logout]")?.addEventListener("click", () => logout());
        bindScreenActions?.({ navigate, toast, activeView });
    }

    function render() {
        const root = document.querySelector(`#${rootId}`);
        if (!root) return;

        document.body.classList.add("kaila-auth");
        const logo = "/assets/brand/kaila-logo.png";
        const displayUserName = topbarDisplayName();
        const userRole = store.user?.role || role;
        const displayRoleLabel = formatRoleLabel(userRole);
        const unread = store.unreadNotifications || 0;
        const unreadBadge = formatCountBadge(unread);
        const userPhoto = store.user?.social_photo_url || "";
        const menuItems = topbarMenuItems(screens);
        const hiddenNav = new Set(["offers", "detail", "chat", "call", "tracking", "completion", "rating", "dispute", "block", "delete", "analytics", "validation", "send-offer", "job-detail", "travel", "mark-done", "rate-client", "profile", "in-progress", "post", "support-detail"]);
        const primaryNav = navItems.filter(([id]) => !id.startsWith("_") && !hiddenNav.has(id));
        const navBadge = (viewId, explicitBadge) => explicitBadge || navBadgeFor(viewId);

        root.innerHTML = `
            <div class="kaila-app">
                <aside class="kaila-sidebar">
                    <a class="kaila-sidebar__brand" href="${navItems[0][3]}" data-view-link="${navItems[0][0]}">
                        <img src="${logo}" alt="KAILA">
                    </a>
                    ${sidebarPostButton ? `<button class="mock-post-btn" type="button" data-view-link="post"><i class="fa-solid fa-plus"></i> Post Request</button>` : ""}
                    <nav class="kaila-nav" aria-label="Main navigation">
                        ${primaryNav.map(([id, label, iconName, , badge]) => {
                            const countBadge = navBadge(id, badge);
                            return `
                            <button class="kaila-nav__item ${id === activeView ? "active" : ""}" type="button" data-view-link="${id}">
                                ${icon(iconName)}<span>${label}</span>
                                ${countBadge ? `<span class="kaila-badge kaila-badge--nav">${countBadge}</span>` : ""}
                                <i class="fa-solid fa-chevron-right kaila-nav__chevron"></i>
                            </button>`;
                        }).join("")}
                    </nav>
                    ${sidebarQuickLinks(role)}
                    <div class="kaila-sidebar__extras">
                        ${sidebarExtras}
                        ${sidebarTrustCard()}
                        ${sidebarPromos ? sidebarPromoCards() : ""}
                    </div>
                </aside>
                <div class="kaila-main">
                    <header class="kaila-topbar kaila-topbar--home">
                        <a class="kaila-mobile-brand" href="${navItems[0][3]}" data-view-link="${navItems[0][0]}">
                            <img src="${logo}" alt="KAILA">
                        </a>
                        <div class="kaila-topbar__spacer"></div>
                        <div class="kaila-topbar__actions">
                            <button class="kaila-icon-btn" type="button" data-view-link="notifications" aria-label="Notifications">
                                ${icon("fa-bell")}${unreadBadge ? `<span class="kaila-badge">${unreadBadge}</span>` : ""}
                            </button>
                            <div class="dropdown">
                                <button class="kaila-user-chip dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                    ${avatar(displayUserName, "", userPhoto)}
                                    <div class="kaila-user-chip__meta">
                                        <strong>${escapeHtml(displayUserName)}</strong>
                                        <small>${escapeHtml(displayRoleLabel)}</small>
                                    </div>
                                    ${icon("fa-chevron-down", "kaila-user-chip__chevron")}
                                </button>
                                <div class="dropdown-menu dropdown-menu-end shadow-sm">
                                    ${menuItems.map((item) => `
                                        <button class="dropdown-item" type="button" data-view-link="${item.view}"><i class="fa-solid ${item.icon} me-2"></i>${escapeHtml(item.label)}</button>
                                    `).join("")}
                                    ${menuItems.length ? `<div class="dropdown-divider"></div>` : ""}
                                    <button class="dropdown-item text-danger" type="button" data-logout><i class="fa-solid fa-right-from-bracket me-2"></i>Logout</button>
                                </div>
                            </div>
                        </div>
                    </header>
                    <main class="kaila-content" data-screen></main>
                </div>
            </div>
            <nav class="kaila-bottom-nav" aria-label="Mobile navigation">
                ${bottomNav.map(([id, iconName, label, badge]) => {
                    const countBadge = navBadge(id, badge);
                    return `
                    <button class="kaila-bottom-nav__item ${id === activeView ? "active" : ""}" type="button" data-view-link="${id}">
                        ${icon(iconName)}
                        ${countBadge ? `<span class="kaila-badge">${countBadge}</span>` : ""}
                        <span>${label}</span>
                    </button>`;
                }).join("")}
            </nav>
            ${fabView ? `<button class="kaila-fab" type="button" data-view-link="${fabView}" aria-label="Quick action">${icon(fabIcon)}</button>` : ""}
        `;

        const screen = document.querySelector("[data-screen]");
        if (store.loading && !store.requests.length) {
            screen.innerHTML = loadingScreen();
        } else if (store.error && !store.requests.length) {
            screen.innerHTML = errorScreen(store.error);
        } else {
            screen.innerHTML = screens[activeView]?.() || screens[navItems[0][0]]?.() || errorScreen("Screen not found.");
        }

        bindLinks();
        bindActions();
    }

    window.addEventListener("popstate", () => {
        activeView = currentView();
        render();
    });

    onStoreChange(render);
    refreshState();

    return { navigate, toast, render };
}
