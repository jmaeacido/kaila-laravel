import { logout, onStoreChange, refreshState, store } from "./kaila-api.js";

export { store, refreshState } from "./kaila-api.js";
export * from "./kaila-api.js";

export function icon(name, extra = "") {
    return `<i class="bi ${name} ${extra}" aria-hidden="true"></i>`;
}

export function avatar(name, size = "") {
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
    return `<div class="kaila-empty">${icon("bi-arrow-repeat")} ${escapeHtml(message)}</div>`;
}

export function errorScreen(message) {
    return `<div class="kaila-empty">${icon("bi-exclamation-triangle")} ${escapeHtml(message)}</div>`;
}

export function createApp(options) {
    const {
        rootId = "marketplace-app",
        theme = "client",
        navItems,
        routeViews,
        screens,
        bottomNav,
        sidebarExtras = "",
        sidebarProfile = "",
        topbarExtra = "",
        getTitle,
        getSubtitle,
        bindScreenActions,
    } = options;

    let activeView = currentView();

    function currentView() {
        const hash = window.location.hash.replace("#", "");
        if (navItems.some(([id]) => id === hash)) return hash;
        return routeViews[window.location.pathname] || navItems[0][0];
    }

    function screenTitle() {
        return getTitle?.(activeView) || navItems.find(([id]) => id === activeView)?.[1] || "KAILA";
    }

    function screenSubtitle() {
        return getSubtitle?.(activeView) || "";
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
                const { selectRequest } = options.storeActions || {};
                selectRequest?.(button.dataset.selectRequest);
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
        const unread = store.unreadNotifications || 0;

        root.innerHTML = `
            <div class="kaila-app">
                <aside class="kaila-sidebar ${theme === "provider" ? "provider" : ""}">
                    <a class="kaila-sidebar__brand" href="${navItems[0][3]}" data-view-link="${navItems[0][0]}">
                        <img src="${logo}" alt="KAILA">
                    </a>
                    ${sidebarProfile}
                    <nav class="kaila-nav" aria-label="Main navigation">
                        ${navItems.filter(([id]) => !id.startsWith("_")).slice(0, 6).map(([id, label, iconName, , badge]) => `
                            <button class="kaila-nav__item ${id === activeView ? "active" : ""}" type="button" data-view-link="${id}">
                                ${icon(iconName)}<span>${label}</span>
                                ${badge ? `<span class="kaila-badge">${badge}</span>` : ""}
                            </button>
                        `).join("")}
                    </nav>
                    <div class="kaila-sidebar__extras">${sidebarExtras}</div>
                </aside>
                <div class="kaila-main">
                    <header class="kaila-topbar">
                        <div class="kaila-topbar__left">
                            <div class="kaila-topbar__mobile-logo"><img src="${logo}" alt="KAILA"></div>
                            <h1>${escapeHtml(screenTitle())}</h1>
                            ${screenSubtitle() ? `<p>${escapeHtml(screenSubtitle())}</p>` : ""}
                        </div>
                        <div class="kaila-topbar__actions">
                            ${topbarExtra}
                            <button class="kaila-icon-btn" type="button" data-view-link="notifications" aria-label="Notifications">
                                ${icon("bi-bell")}${unread ? `<span class="kaila-badge">${unread}</span>` : ""}
                            </button>
                            <div class="kaila-user-chip">
                                ${avatar(userName)}
                                <span>${escapeHtml(userName)}</span>
                                ${icon("bi-chevron-down")}
                            </div>
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
            ${theme === "client" ? `<button class="kaila-fab" type="button" data-view-link="support" aria-label="Support chat">${icon("bi-chat-dots-fill")}</button>` : ""}
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
