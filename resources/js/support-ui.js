import {
    canResolveDisputes,
    canWriteSupportNotes,
    formatBudget,
    loadDirectMessages,
    loadSupportJobMessages,
    postSupportNote,
    requestTitle,
    selectSupportPeer,
    sendDirectMessage,
    supportActivities,
    supportDirectoryUsers,
    supportDisputeAction,
    supportMetrics,
    supportPeer,
    supportQueue,
    supportReportAction,
    supportThreads,
    store,
    timeAgo,
} from "./kaila-api.js";
import { attachmentsFromForm, renderAttachments } from "./kaila-media.js";
import { bindNotificationActions, notificationActivityRow } from "./kaila-shared-screens.js";
import {
    card,
    escapeHtml,
    sectionHead,
} from "./kaila-ui-core.js";

export const supportNavItems = [
    ["home", "Support Desk", "fa-headset", "/home"],
    ["queue", "Queue", "fa-list-check", "/queue"],
    ["reports", "Reports", "fa-shield-halved", "/reports"],
    ["disputes", "Disputes", "fa-scale-balanced", "/disputes"],
    ["inbox", "Direct Inbox", "fa-inbox", "/messages"],
    ["clients", "Clients", "fa-user-group", "/clients"],
    ["providers", "Providers", "fa-screwdriver-wrench", "/providers"],
    ["activity", "Activity", "fa-bell", "/notifications"],
    ["settings", "Settings", "fa-gear", "/settings"],
];

export const supportRouteViews = {
    "/home": "home",
    "/queue": "queue",
    "/reports": "reports",
    "/disputes": "disputes",
    "/messages": "inbox",
    "/clients": "clients",
    "/providers": "providers",
    "/notifications": "activity",
    "/settings": "settings",
};

const supportSubtitles = {
    home: "Triage reports, disputes, and customer conversations.",
    queue: "Reported and disputed jobs needing attention.",
    reports: "Review safety reports from clients and providers.",
    disputes: "Resolve disputed jobs with support outcomes.",
    inbox: "Direct conversations with clients and providers.",
    clients: "Contact clients and review their request history.",
    providers: "Contact providers and review service coverage.",
    activity: "Support notifications and team notes.",
    settings: "Support desk account and workspace settings.",
};

const DESK_NAME = "KAILA Customer Service";

export const supportScreens = {
    home() {
        const metrics = supportMetrics();
        const queue = supportQueue();
        const reports = (store.admin?.reports || []).filter((report) => ["Open", "In Review"].includes(report.status));
        return `
            <div class="support-hero">
                <div>
                    <span class="support-hero__badge"><i class="fa-solid fa-headset"></i> ${escapeHtml(DESK_NAME)}</span>
                    <h1>Support Desk</h1>
                    <p>${escapeHtml(supportSubtitles.home)}</p>
                </div>
            </div>
            <div class="support-kpi-grid">
                ${supportKpi("Queue", metrics.queueCount || 0, "fa-list-check", "blue")}
                ${supportKpi("Open reports", metrics.openReports || 0, "fa-shield-halved", "orange")}
                ${supportKpi("Disputes", metrics.disputes || 0, "fa-scale-balanced", "red")}
                ${supportKpi("Inbox", metrics.directThreads || 0, "fa-inbox", "purple")}
            </div>
            <div class="support-grid-2">
                ${supportPanel("Priority Queue", queue.slice(0, 4).map(queueCard).join("") || emptyState("No jobs in the support queue."))}
                ${supportPanel("Open Reports", reports.slice(0, 4).map(reportCard).join("") || emptyState("No open reports."))}
            </div>
            ${supportPanel("Recent Conversations", threadRows(supportThreads().slice(0, 5)) || emptyState("No direct conversations yet."))}`;
    },
    queue() {
        const queue = supportQueue();
        return `
            ${supportToolbar("Support Queue", supportSubtitles.queue)}
            <div class="support-card-list">${queue.map(queueCard).join("") || emptyState("No reported or disputed jobs.")}</div>`;
    },
    reports() {
        const reports = store.admin?.reports || [];
        return `
            ${supportToolbar("Reports", supportSubtitles.reports)}
            <div class="support-card-list">${reports.map(reportCard).join("") || emptyState("No moderation reports.")}</div>`;
    },
    disputes() {
        const disputes = supportQueue().filter((item) => item.status === "Disputed");
        return `
            ${supportToolbar("Disputes", supportSubtitles.disputes)}
            <div class="support-card-list">${disputes.map(disputeCard).join("") || emptyState("No active disputes.")}</div>`;
    },
    inbox() {
        const peer = supportPeer();
        const threads = supportThreads();
        const messages = store.directMessages;
        return `
            <div class="support-inbox">
                <aside class="support-thread-list">
                    <div class="support-thread-list__head"><strong>Conversations</strong></div>
                    ${threads.map(threadButton).join("") || emptyState("No conversations yet.")}
                </aside>
                <section class="support-thread-panel">
                    <header class="support-thread-panel__head">
                        <strong>${escapeHtml(peer ? displayPeerName(peer) : "Select a conversation")}</strong>
                        <small>${escapeHtml(peer?.role || "Choose a client or provider thread")}</small>
                    </header>
                    <div class="support-thread-panel__messages" data-support-messages>
                        ${messages.map(directMessageBubble).join("") || `<p class="mock-empty">${peer ? "No messages yet." : "Pick a thread to start chatting."}</p>`}
                    </div>
                    <form data-support-compose class="support-compose" ${peer ? "" : "hidden"}>
                        <button type="button"><i class="fa-solid fa-paperclip"></i></button>
                        <input class="form-control" name="body" placeholder="Message ${escapeHtml(peer ? displayPeerName(peer) : "user")}" required>
                        <button class="mock-send-btn" type="submit"><i class="fa-solid fa-paper-plane"></i></button>
                    </form>
                </section>
            </div>`;
    },
    clients() {
        const clients = supportDirectoryUsers().filter((user) => user.role === "client");
        return `
            ${supportToolbar("Clients", supportSubtitles.clients)}
            <div class="support-card-list">${clients.map((user) => directoryCard(user, "client")).join("") || emptyState("No client accounts.")}</div>`;
    },
    providers() {
        const providers = supportDirectoryUsers().filter((user) => user.role === "provider");
        return `
            ${supportToolbar("Providers", supportSubtitles.providers)}
            <div class="support-card-list">${providers.map((user) => directoryCard(user, "provider")).join("") || emptyState("No provider accounts.")}</div>`;
    },
    activity() {
        const notes = supportActivities();
        const notifications = store.notifications || [];
        const hasUnread = (store.unreadNotifications || 0) > 0;
        return `
            ${supportToolbar("Activity", supportSubtitles.activity)}
            <div class="support-grid-2">
                ${supportPanel("Notifications", `
                    ${hasUnread ? `<div class="mb-3"><button class="btn btn-outline-primary btn-sm" type="button" data-mark-notifications>Mark all as read</button></div>` : ""}
                    <div class="notification-activity-list">
                        ${notifications.length ? notifications.map(notificationActivityRow).join("") : emptyState("No notifications yet.")}
                    </div>
                `)}
                ${supportPanel("Team Notes", `
                    ${canWriteSupportNotes() ? `<form data-support-note class="support-note-form"><textarea class="form-control" name="detail" placeholder="Add a team note for other support agents..." required></textarea><button class="btn btn-primary mt-2" type="submit">Post note</button></form>` : ""}
                    ${notes.length ? notes.map(activityRow).join("") : emptyState("No team notes yet.")}
                `)}
            </div>`;
    },
    settings() {
        return `
            ${supportToolbar("Settings", supportSubtitles.settings)}
            <div class="support-grid-2">
                ${supportPanel("Desk Identity", `
                    <div class="support-desk-identity">
                        <span class="support-desk-identity__avatar">CS</span>
                        <div>
                            <strong>${escapeHtml(DESK_NAME)}</strong>
                            <small>Marketplace users see this desk identity, not your personal account name.</small>
                            <em>Signed in as @${escapeHtml(store.user?.username || "support")}</em>
                        </div>
                    </div>
                    <button class="btn btn-danger w-100 mt-3" data-logout type="button"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
                `)}
                ${supportPanel("Shortcuts", [
                    quickLink("Queue", "Reported jobs", "queue", "fa-list-check"),
                    quickLink("Reports", "Safety queue", "reports", "fa-shield-halved"),
                    quickLink("Inbox", "Direct messages", "inbox", "fa-inbox"),
                ].join(""))}
            </div>`;
    },
};

export function getSupportStaffConfig() {
    return {
        role: "customer_service",
        navItems: supportNavItems,
        routeViews: supportRouteViews,
        screens: supportScreens,
        sidebarPostButton: false,
        bottomNav: [
            ["home", "fa-headset", "Desk"],
            ["queue", "fa-list-check", "Queue"],
            ["reports", "fa-shield-halved", "Reports"],
            ["inbox", "fa-inbox", "Inbox"],
            ["settings", "fa-gear", "Me"],
        ],
        sidebarExtras: `<div class="mock-trust-card support-trust-card"><i class="fa-solid fa-headset"></i><div><strong>${escapeHtml(DESK_NAME)}</strong><p>Report triage, dispute resolution, and direct customer care.</p></div></div>`,
        fabView: "inbox",
        fabIcon: "fa-inbox",
        getTitle: (view) => view === "home" ? "" : supportNavItems.find(([id]) => id === view)?.[1] || "Support Desk",
        getSubtitle: (view) => supportSubtitles[view] || supportSubtitles.home,
        bindScreenActions({ toast, navigate }) {
            bindSupportActions({ toast, navigate });
        },
    };
}

export function bindSupportActions({ toast, navigate }) {
    bindNotificationActions({ navigate, toast });

    document.querySelectorAll("[data-support-thread]").forEach((button) => {
        button.addEventListener("click", async () => {
            selectSupportPeer(button.dataset.supportThread);
            try {
                await loadDirectMessages(button.dataset.supportThread);
            } catch (error) {
                toast(error.message);
            }
        });
    });

    document.querySelectorAll("[data-support-contact]").forEach((button) => {
        button.addEventListener("click", async () => {
            selectSupportPeer(button.dataset.supportContact);
            navigate("inbox");
            try {
                await loadDirectMessages(button.dataset.supportContact);
            } catch (error) {
                toast(error.message);
            }
        });
    });

    document.querySelector("[data-support-compose]")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const peerId = store.supportPeerId;
        if (!peerId) return toast("Select a conversation first.");
        const form = event.target;
        try {
            const attachments = await attachmentsFromForm(form);
            await sendDirectMessage(peerId, new FormData(form).get("body"), attachments);
            form.reset();
        } catch (error) {
            toast(error.message);
        }
    });

    document.querySelector("[data-support-note]")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const detail = new FormData(event.target).get("detail");
        try {
            await postSupportNote(detail);
            event.target.reset();
            toast("Team note posted.");
        } catch (error) {
            toast(error.message);
        }
    });

    document.querySelectorAll("[data-support-report-status]").forEach((button) => {
        button.addEventListener("click", async () => {
            try {
                await supportReportAction(button.dataset.supportReportStatus, button.dataset.status, "Reviewed by support desk.");
                toast("Report updated.");
            } catch (error) {
                toast(error.message);
            }
        });
    });

    document.querySelectorAll("[data-support-dispute-action]").forEach((button) => {
        button.addEventListener("click", async () => {
            try {
                await supportDisputeAction(button.dataset.requestId, button.dataset.supportDisputeAction, {
                    note: "Updated by KAILA Customer Service.",
                    revision_note: "Revision requested by KAILA Customer Service.",
                });
                toast("Dispute outcome applied.");
            } catch (error) {
                toast(error.message);
            }
        });
    });

    document.querySelectorAll("[data-support-view-job]").forEach((button) => {
        button.addEventListener("click", async () => {
            try {
                await loadSupportJobMessages(button.dataset.supportViewJob);
            } catch (error) {
                toast(error.message);
            }
        });
    });

    if (document.querySelector("[data-support-compose]") && store.supportPeerId && !store.directMessages.length) {
        loadDirectMessages(store.supportPeerId).catch(() => {});
    }
}

function supportKpi(label, value, iconName, tone) {
    return `<article class="support-kpi support-kpi--${tone}"><i class="fa-solid ${iconName}"></i><strong>${value}</strong><span>${escapeHtml(label)}</span></article>`;
}

function supportToolbar(title, subtitle) {
    return `<div class="support-toolbar"><div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div></div>`;
}

function supportPanel(title, body) {
    return card(`<div class="support-panel-head"><h2>${escapeHtml(title)}</h2></div>${body}`);
}

function emptyState(text) {
    return `<p class="support-empty">${escapeHtml(text)}</p>`;
}

function quickLink(title, sub, view, iconName) {
    return `<button class="support-quick-link" type="button" data-view-link="${view}"><i class="fa-solid ${iconName}"></i><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(sub)}</small></span></button>`;
}

function queueCard(item) {
    return `<article class="support-queue-card">
        <div class="support-queue-card__meta">
            <strong>${escapeHtml(item.category || "Job")}</strong>
            <span class="support-status support-status--${statusTone(item.status)}">${escapeHtml(item.status || "Unknown")}</span>
        </div>
        <p>${escapeHtml(requestTitle(item))}</p>
        <small>${escapeHtml(item.client?.name || "Client")}${item.provider ? ` → ${escapeHtml(item.provider.name)}` : ""} · ${escapeHtml(formatBudget(item))}</small>
        ${item.openReport ? `<small class="support-queue-card__report"><i class="fa-solid fa-shield-halved"></i> ${escapeHtml(item.openReport.reason || "Report")} (${escapeHtml(item.openReport.status)})</small>` : ""}
        <div class="support-card-actions">
            <button class="btn btn-sm btn-outline-primary" type="button" data-support-view-job="${item.id}">View job chat</button>
            ${item.client ? `<button class="btn btn-sm btn-outline-secondary" type="button" data-support-contact="${item.client.id}">Message client</button>` : ""}
            ${item.provider ? `<button class="btn btn-sm btn-outline-secondary" type="button" data-support-contact="${item.provider.id}">Message provider</button>` : ""}
        </div>
        ${store.jobMessages.length && store.selectedRequestId === item.id ? `<div class="support-job-chat-preview">${store.jobMessages.map(jobMessageBubble).join("")}</div>` : ""}
    </article>`;
}

function disputeCard(item) {
    return `<article class="support-dispute-card">
        <div class="support-dispute-card__head">
            <strong>${escapeHtml(item.category || "Dispute")}</strong>
            <span class="support-status support-status--red">Disputed</span>
        </div>
        <p>${escapeHtml(item.dispute_note || "No dispute note provided.")}</p>
        <small>${escapeHtml(item.client?.name || "Client")}${item.provider ? ` vs ${escapeHtml(item.provider.name)}` : ""}</small>
        <div class="support-dispute-actions">
            ${canResolveDisputes() ? [
                ["support_resume_job", "Resume job", "success"],
                ["support_request_revision", "Request revision", "warning"],
                ["support_release_payment", "Release payment", "primary"],
                ["support_cancel_request", "Cancel job", "danger"],
                ["resolve_dispute", "Mark resolved", "secondary"],
            ].map(([action, label, tone]) => `<button class="btn btn-sm btn-${tone === "secondary" ? "outline-secondary" : tone}" type="button" data-request-id="${item.id}" data-support-dispute-action="${action}">${label}</button>`).join("") : `<span class="text-muted small">Read-only dispute view</span>`}
        </div>
    </article>`;
}

function reportCard(report) {
    return `<article class="support-report-card">
        <div>
            <strong>${escapeHtml(report.reason || "Report")}</strong>
            <span class="support-status support-status--orange">${escapeHtml(report.status || "Open")}</span>
            <small>${escapeHtml(report.type || "report")} · ${escapeHtml(report.reporter_name || report.reporter_username || "User")} · ${timeAgo(report.updated_at)}</small>
            <p>${escapeHtml(report.details || "No details provided.")}</p>
        </div>
        <div class="support-card-actions">
            ${["Open", "In Review", "Closed"].map((status) => `<button class="btn btn-sm btn-outline-primary" type="button" data-support-report-status="${report.id}" data-status="${status}">${status}</button>`).join("")}
        </div>
    </article>`;
}

function directoryCard(user, kind) {
    const requests = store.requests.filter((request) => kind === "client" ? request.client_id === user.id : request.accepted_provider_id === user.id);
    return `<article class="support-directory-card">
        <div>
            <strong>${escapeHtml(user.name || user.username || kind)}</strong>
            <small>@${escapeHtml(user.username || "user")} · ${requests.length} related jobs · ${escapeHtml(user.area || "No area")}</small>
        </div>
        <button class="btn btn-sm btn-primary" type="button" data-support-contact="${user.id}"><i class="fa-solid fa-message"></i> Message</button>
    </article>`;
}

function threadButton(thread) {
    const peer = thread.peer || {};
    const active = store.supportPeerId === peer.id ? " is-active" : "";
    return `<button class="support-thread-item${active}" type="button" data-support-thread="${peer.id}">
        <strong>${escapeHtml(displayPeerName(peer))}</strong>
        <small>${escapeHtml(peer.role || "user")} · ${timeAgo(thread.latestMessageAt)}</small>
    </button>`;
}

function threadRows(threads) {
    return threads.map((thread) => `<div class="support-thread-row"><strong>${escapeHtml(displayPeerName(thread.peer))}</strong><small>${escapeHtml(thread.peer?.role || "")} · ${timeAgo(thread.latestMessageAt)}</small></div>`).join("");
}

function directMessageBubble(message) {
    const outgoing = message.sender_id === store.user?.id;
    return `<div class="mock-chat-bubble ${outgoing ? "out" : "in"}">${escapeHtml(message.body || "")}${renderAttachments(message.attachments)}</div>`;
}

function jobMessageBubble(message) {
    return `<div class="support-job-message"><strong>${escapeHtml(message.sender?.name || "User")}</strong><span>${escapeHtml(message.body || "")}</span></div>`;
}

function activityRow(item) {
    return `<div class="support-activity-row"><strong>${escapeHtml(item.user_name || item.user_username || "Support")}</strong><small>${escapeHtml(item.detail || "")} · ${timeAgo(item.created_at)}</small></div>`;
}

function displayPeerName(peer) {
    if (!peer) return "User";
    if (peer.role === "customer_service") return DESK_NAME;
    return peer.name || peer.username || "User";
}

function statusTone(status = "") {
    if (status === "Disputed") return "red";
    if (["Open", "In Review"].includes(status)) return "orange";
    return "blue";
}
