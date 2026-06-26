import { logout, onStoreChange, refreshState, store } from "./kaila-api.js";
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
        const userName = store.user?.name || "KAILA User";
        const userRole = store.user?.role || role;
        const unread = store.unreadNotifications || 0;
        const area = store.user?.area || "Your area";
        const hiddenNav = new Set(["offers", "detail", "chat", "call", "tracking", "completion", "rating", "dispute", "block", "delete", "analytics", "validation", "send-offer", "job-detail", "travel", "mark-done", "rate-client", "profile", "in-progress", "post", "assistant", "requests", "support"]);
        const primaryNav = navItems.filter(([id]) => !id.startsWith("_") && !hiddenNav.has(id)).slice(0, 6);
        const inboxUnread = store.unreadMessages || store.unreadNotifications || 0;
        const activityUnread = store.unreadNotifications || 0;

        root.innerHTML = `
            <div class="kaila-app">
                <aside class="kaila-sidebar">
                    <a class="kaila-sidebar__brand" href="${navItems[0][3]}" data-view-link="${navItems[0][0]}">
                        <img src="${logo}" alt="KAILA">
                    </a>
                    ${sidebarPostButton || ["requests", "post"].includes(activeView) ? `<button class="mock-post-btn" type="button" data-view-link="post"><i class="fa-solid fa-plus"></i> Post Request</button>` : ""}
                    <nav class="kaila-nav" aria-label="Main navigation">
                        ${primaryNav.map(([id, label, iconName, , badge]) => {
                            const navBadge = badge
                                || (id === "inbox" && inboxUnread ? inboxUnread : "")
                                || (id === "notifications" && activityUnread ? activityUnread : "");
                            return `
                            <button class="kaila-nav__item ${id === activeView ? "active" : ""}" type="button" data-view-link="${id}">
                                ${icon(iconName)}<span>${label}</span>
                                ${navBadge ? `<span class="kaila-badge kaila-badge--nav">${navBadge}</span>` : ""}
                                <i class="fa-solid fa-chevron-right kaila-nav__chevron"></i>
                            </button>`;
                        }).join("")}
                    </nav>
                    ${sidebarQuickLinks(role)}
                    <div class="kaila-sidebar__extras">
                        ${sidebarExtras}
                        ${sidebarTrustCard()}
                        ${sidebarPromos || ["requests", "settings"].includes(activeView) ? sidebarPromoCards() : ""}
                    </div>
                </aside>
                <div class="kaila-main">
                    <header class="kaila-topbar ${activeView === "home" ? "kaila-topbar--home" : ""}">
                        ${topbarSearch || ["requests", "post", "inbox"].includes(activeView) ? `
                            <div class="kaila-topbar__search-wrap">
                                <div class="mock-search mock-search--header">
                                    <i class="fa-solid fa-magnifying-glass"></i>
                                    <input type="search" placeholder="Search for services, providers, or requests..." aria-label="Search">
                                    <button class="mock-search__filter" type="button"><i class="fa-solid fa-sliders"></i> Filter</button>
                                </div>
                            </div>
                        ` : showTopbarHeading() ? `<div class="kaila-topbar__left"><h1>${escapeHtml(screenTitle())}</h1>${screenSubtitle() ? `<p>${escapeHtml(screenSubtitle())}</p>` : ""}</div>` : `<div class="kaila-topbar__spacer"></div>`}
                        <div class="kaila-topbar__actions">
                            <button class="kaila-icon-btn" type="button" data-view-link="inbox" aria-label="Messages">
                                ${icon("fa-comment-dots")}${unread ? `<span class="kaila-badge">${unread}</span>` : ""}
                            </button>
                            <button class="kaila-icon-btn" type="button" data-view-link="notifications" aria-label="Notifications">
                                ${icon("fa-bell")}${unread ? `<span class="kaila-badge">${unread}</span>` : ""}
                            </button>
                            <div class="kaila-user-chip">
                                ${avatar(userName, "", store.user?.social_photo_url || "")}
                                <div>
                                    <strong>${escapeHtml(userName)}</strong>
                                    <small>${escapeHtml(userRole)}</small>
                                </div>
                                ${icon("fa-chevron-down")}
                            </div>
                            <button class="kaila-location-chip" type="button"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(area)} <i class="fa-solid fa-chevron-down"></i></button>
                        </div>
                    </header>
                    <main class="kaila-content" data-screen></main>
                </div>
            </div>
            <nav class="kaila-bottom-nav" aria-label="Mobile navigation">
                ${bottomNav.map(([id, iconName, label, badge]) => `
                    <button class="kaila-bottom-nav__item ${id === activeView ? "active" : ""}" type="button" data-view-link="${id}">
                        ${icon(iconName)}
                        ${badge ? `<span class="kaila-badge">${badge}</span>` : ""}
                        <span>${label}</span>
                    </button>
                `).join("")}
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
