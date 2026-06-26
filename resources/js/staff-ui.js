import {
    loadAnalytics,
    loadDirectMessages,
    markNotificationsRead,
    sendDirectMessage,
    store,
} from "./kaila-api.js";
import { attachmentsFromForm, renderAttachments } from "./kaila-media.js";
import {
    analyticsScreen,
    bindFeedActions,
    bindStaffActions,
    feedScreen,
    validationScreen,
} from "./kaila-shared-screens.js";
import { mockInboxShell, mockPageHero } from "./kaila-mock-ui.js";
import {
    card,
    createApp,
    escapeHtml,
    firstName,
    greeting,
    sectionHead,
} from "./kaila-ui-core.js";

const navItems = [
    ["home", "Support Desk", "fa-headset", "/home"],
    ["inbox", "User Messages", "fa-comment-dots", "/messages"],
    ["feed", "Feed", "fa-users", "/feed"],
    ["analytics", "Analytics", "fa-chart-line", "/settings#analytics"],
    ["validation", "Validation", "fa-clipboard-check", "/settings#validation"],
    ["notifications", "Activity", "fa-bell", "/notifications"],
    ["settings", "Settings", "fa-gear", "/settings"],
];

const routeViews = {
    "/home": "home",
    "/messages": "inbox",
    "/feed": "feed",
    "/notifications": "notifications",
    "/settings": "settings",
};

const subtitles = {
    home: "Monitor marketplace activity and respond to users.",
    inbox: "Direct support conversations.",
    feed: "Community feed moderation view.",
    analytics: "Groq-powered pilot insights.",
    validation: "Record surveys and interviews.",
};

const screens = {
    home() {
        const metrics = store.metrics?.staff || store.metrics || {};
        return `
            ${mockPageHero("", subtitles.home, store.user?.name)}
            <div class="row g-3 mb-4">
                ${[
                    ["Requests", metrics.requests || store.requests?.length || 0],
                    ["Providers", metrics.activeProviders || store.providers?.length || 0],
                    ["Unread", store.unreadNotifications || 0],
                    ["Open reports", metrics.openReports || 0],
                ].map(([label, value]) => `<div class="col-md-3"><div class="mock-stat-card"><div class="mock-stat-card__value">${value}</div><div class="mock-stat-card__label">${label}</div></div></div>`).join("")}
            </div>
            ${card(`
                ${sectionHead("Quick actions")}
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-primary" type="button" data-view-link="inbox"><i class="fa-solid fa-comment-dots"></i> Open inbox</button>
                    <button class="btn btn-outline-primary" type="button" data-view-link="analytics"><i class="fa-solid fa-chart-line"></i> Analytics</button>
                    <button class="btn btn-outline-primary" type="button" data-view-link="validation"><i class="fa-solid fa-clipboard-check"></i> Validation</button>
                </div>
            `)}`;
    },
    inbox() {
        return mockInboxShell({
            threads: store.requests.slice(0, 5),
            messages: store.directMessages,
            activeTitle: "Support conversation",
            activeSub: "User messages",
            composeAttr: "data-staff-support",
        });
    },
    feed: feedScreen,
    analytics: analyticsScreen,
    validation: validationScreen,
    notifications() {
        const items = store.notifications || [];
        return `
            ${mockPageHero("Activity", "Staff notifications")}
            ${card(items.length ? items.map((item) => `
                <div class="mock-home-request">
                    <span class="mock-thumb"><i class="fa-solid fa-bell"></i></span>
                    <span class="mock-home-request__body">
                        <strong>${escapeHtml(item.title || item.type)}</strong>
                        <small>${escapeHtml(item.body || "")}</small>
                    </span>
                </div>`).join("") : `<p class="mock-empty">No notifications yet.</p>`)}
        `;
    },
    settings() {
        return card(`
            <p class="text-muted">Signed in as ${escapeHtml(store.user?.role || "staff")} · ${escapeHtml(store.user?.email || "")}</p>
            <button class="btn btn-danger w-100 mt-3" data-logout><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
        `);
    },
};

export function initStaffApp() {
    return createApp({
        role: "client",
        navItems,
        routeViews,
        screens,
        sidebarPostButton: false,
        bottomNav: [
            ["home", "fa-headset", "Desk"],
            ["inbox", "fa-comment-dots", "Inbox"],
            ["feed", "fa-users", "Feed"],
            ["analytics", "fa-chart-line", "Insights"],
            ["settings", "fa-gear", "Me"],
        ],
        sidebarExtras: `<div class="mock-trust-card"><i class="fa-solid fa-shield-check"></i><div><strong>Staff workspace</strong><p>Support, analytics, and validation tools.</p></div></div>`,
        fabView: "inbox",
        fabIcon: "fa-comment-dots",
        getTitle: (view) => view === "home" ? "" : navItems.find(([id]) => id === view)?.[1] || "Support Desk",
        getSubtitle: (view) => subtitles[view] || subtitles.home,
        bindScreenActions({ toast }) {
            bindFeedActions({ toast });
            bindStaffActions({ toast });

            document.querySelector("[data-staff-support]")?.addEventListener("submit", async (event) => {
                event.preventDefault();
                const peerId = store.supportPeerId || store.supportDesk?.id;
                if (!peerId) return toast("No active support thread selected.");
                const form = event.target;
                try {
                    const attachments = await attachmentsFromForm(form);
                    await sendDirectMessage(peerId, new FormData(form).get("body"), attachments);
                    form.reset();
                } catch (error) {
                    toast(error.message);
                }
            });

            document.querySelector("[data-mark-notifications]")?.addEventListener("click", async () => {
                try {
                    await markNotificationsRead();
                    toast("Notifications marked read.");
                } catch (error) {
                    toast(error.message);
                }
            });

            if (document.querySelector("[data-feed-compose]")) {
                import("./kaila-api.js").then(({ loadFeed }) => loadFeed().catch(() => {}));
            }
            if (document.querySelector("[data-refresh-analytics]")) {
                loadAnalytics().catch(() => {});
            }
        },
    });
}
