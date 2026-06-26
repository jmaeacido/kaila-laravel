import {
    adminCreateUser,
    adminProviderProfile,
    adminReportAction,
    adminUpdateUser,
    adminUserStatus,
    canManageAccount,
    cfg,
    deleteFeedPost,
    deleteValidationEntry,
    formatBudget,
    isAdminUser,
    isCustomerServiceUser,
    isOpsUser,
    isSuperAdminUser,
    jobAction,
    loadAnalytics,
    loadDirectMessages,
    markNotificationsRead,
    requestTitle,
    sendDirectMessage,
    store,
    timeAgo,
    updateValidationEntry,
} from "./kaila-api.js";
import { attachmentsFromForm, renderAttachments } from "./kaila-media.js";
import {
    analyticsScreen,
    bindFeedActions,
    bindStaffActions,
    feedScreen,
    validationScreen,
} from "./kaila-shared-screens.js";
import { getSupportStaffConfig } from "./support-ui.js";
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
    ["home", "Admin Dashboard", "fa-gauge-high", "/home"],
    ["accounts", "Accounts", "fa-users-gear", "/accounts"],
    ["jobs", "Jobs", "fa-briefcase", "/jobs"],
    ["providers", "Providers", "fa-screwdriver-wrench", "/providers"],
    ["clients", "Clients", "fa-user-group", "/clients"],
    ["support", "Support", "fa-headset", "/support"],
    ["reports", "Reports", "fa-shield-halved", "/reports"],
    ["validation", "Validation", "fa-clipboard-check", "/validation"],
    ["feed", "Feed Moderation", "fa-users", "/feed"],
    ["analytics", "Analytics", "fa-chart-line", "/analytics"],
    ["activity", "Activity", "fa-bell", "/notifications"],
    ["settings", "Settings", "fa-gear", "/settings"],
];

const routeViews = {
    "/home": "home",
    "/accounts": "accounts",
    "/jobs": "jobs",
    "/providers": "providers",
    "/clients": "clients",
    "/support": "support",
    "/reports": "reports",
    "/validation": "validation",
    "/analytics": "analytics",
    "/messages": "inbox",
    "/feed": "feed",
    "/notifications": "notifications",
    "/settings": "settings",
};

const subtitles = {
    home: "Monitor marketplace health and staff operations.",
    accounts: "Manage users, staff, and account status.",
    jobs: "Review jobs, disputes, and service request flow.",
    providers: "Inspect provider profiles and service coverage.",
    clients: "Review clients, trust signals, and account actions.",
    support: "Handle customer support, reports, and disputes.",
    reports: "Review safety reports and moderation queue.",
    feed: "Community feed moderation view.",
    analytics: "Groq-powered pilot insights.",
    validation: "Record surveys and interviews.",
    activity: "Notifications and audit trail.",
};
let loadedStaffFeed = false;
let loadedStaffAnalytics = false;

const screens = {
    home() {
        const metrics = staffMetrics();
        return `
            ${mockPageHero("", subtitles.home, store.user?.name)}
            <div class="admin-kpi-grid">
                ${adminKpi("Requests", metrics.requests || 0, "fa-list-check", "blue")}
                ${adminKpi("Active jobs", metrics.activeJobs || 0, "fa-person-digging", "green")}
                ${adminKpi("Open reports", metrics.openReports || 0, "fa-shield-halved", "orange")}
                ${adminKpi("Disputes", metrics.disputes || 0, "fa-triangle-exclamation", "red")}
                ${adminKpi("Providers", metrics.activeProviders || 0, "fa-screwdriver-wrench", "purple")}
                ${adminKpi("GMV", peso(metrics.grossValue || 0), "fa-coins", "green")}
            </div>
            <div class="admin-grid-2">
                ${adminPanel("Priority Queue", [
                    quickLink("Reports", `${metrics.openReports || 0} open`, "reports", "fa-shield-halved"),
                    quickLink("Validation", `${metrics.validationEntries || 0} entries`, "validation", "fa-clipboard-check"),
                    quickLink("Disputes", `${metrics.disputes || 0} jobs`, "jobs", "fa-scale-balanced"),
                    quickLink("Support", `${store.unreadNotifications || 0} unread`, "support", "fa-headset"),
                ].join(""))}
                ${adminPanel("Role Scope", roleScopeHtml())}
            </div>
            ${adminPanel("Recent Jobs", requestRows(store.requests.slice(0, 5), true))}`;
    },
    accounts() {
        if (!isAdminUser()) return lockedScreen("Only admins can manage accounts.");
        const users = adminUsers();
        return `
            ${adminToolbar("Accounts", "Create, edit, suspend, ban, or delete accounts.", `<button class="btn btn-primary" type="button" data-admin-account-new><i class="fa-solid fa-user-plus"></i> New account</button>`)}
            <div class="admin-filter-row">
                ${["all", "client", "provider", "admin", "customer_service", "ops"].map((role) => `<button class="admin-filter" type="button" data-admin-filter-role="${role}">${roleLabel(role)}</button>`).join("")}
            </div>
            <div class="admin-card-list" data-admin-account-list>
                ${users.map(accountCard).join("") || emptyState("No accounts found.")}
            </div>`;
    },
    jobs() {
        if (isOpsUser()) return lockedScreen("Ops accounts are limited to validation work.");
        return `
            ${adminToolbar("Jobs", "Track service requests, active work, and disputes.", "")}
            <div class="admin-card-list">${requestRows(store.requests, true)}</div>`;
    },
    providers() {
        if (isOpsUser()) return lockedScreen("Ops accounts are limited to validation work.");
        const providers = adminUsers().filter((user) => user.role === "provider");
        return `
            ${adminToolbar("Providers", "Review provider status, services, and coverage.", "")}
            <div class="admin-card-list">${providers.map(providerCard).join("") || emptyState("No provider accounts yet.")}</div>`;
    },
    clients() {
        if (!(isAdminUser() || isCustomerServiceUser())) return lockedScreen("This view is for admin and customer service roles.");
        const clients = adminUsers().filter((user) => user.role === "client");
        return `
            ${adminToolbar("Clients", "Review client history, reports, and account state.", "")}
            <div class="admin-card-list">${clients.map(clientCard).join("") || emptyState("No client accounts yet.")}</div>`;
    },
    support() {
        if (isOpsUser()) return lockedScreen("Ops accounts are limited to validation work.");
        return mockInboxShell({
            threads: store.requests.slice(0, 5),
            messages: store.directMessages,
            activeTitle: "Support conversation",
            activeSub: "User messages",
            composeAttr: "data-staff-support",
        });
    },
    inbox() { return screens.support(); },
    reports() {
        if (!(isAdminUser() || isCustomerServiceUser())) return lockedScreen("Only admins and customer service can manage reports.");
        const reports = store.admin?.reports || [];
        return `
            ${adminToolbar("Reports", "Review user and job reports from the community.", "")}
            <div class="admin-card-list">${reports.map(reportCard).join("") || emptyState("No moderation reports.")}</div>`;
    },
    feed: feedScreen,
    analytics: analyticsScreen,
    validation() {
        if (!(isAdminUser() || isOpsUser())) return lockedScreen("Validation is limited to admin and ops roles.");
        const entries = store.admin?.validationEntries || [];
        return `
            <div class="admin-grid-2">
                ${validationScreen()}
                ${adminPanel("Validation Entries", entries.map(validationEntryCard).join("") || emptyState("No validation entries yet."))}
            </div>`;
    },
    activity() {
        const items = store.notifications || [];
        return `
            ${mockPageHero("Activity", "Staff notifications")}
            <div class="admin-grid-2">
                ${adminPanel("Notifications", items.length ? items.map(notificationRow).join("") : emptyState("No notifications yet."))}
                ${adminPanel("Audit Trail", auditRows())}
            </div>
        `;
    },
    notifications() { return screens.activity(); },
    settings() {
        return `
            ${adminToolbar("Staff Settings", "Role, account controls, and workspace shortcuts.", "")}
            <div class="admin-grid-2">
                ${adminPanel("Account", `
                    <div class="admin-profile-row">
                        <strong>${escapeHtml(store.user?.name || "KAILA Staff")}</strong>
                        <span>${escapeHtml(store.user?.email || "")}</span>
                        <em>${roleBadge(store.user?.role)} ${isSuperAdminUser() ? roleBadge("super_admin") : ""}</em>
                    </div>
                    <button class="btn btn-danger w-100 mt-3" data-logout><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
                `)}
                ${adminPanel("Shortcuts", [
                    quickLink("Accounts", "Manage users", "accounts", "fa-users-gear"),
                    quickLink("Reports", "Safety queue", "reports", "fa-shield-halved"),
                    quickLink("Audit", "Review activity", "activity", "fa-clock-rotate-left"),
                ].join(""))}
            </div>`;
    },
};

export function initStaffApp() {
    if (isCustomerServiceUser()) {
        return createApp(getSupportStaffConfig());
    }

    return createApp({
        role: cfg.user?.role || "admin",
        navItems,
        routeViews,
        screens,
        sidebarPostButton: false,
        bottomNav: [
            ["home", "fa-gauge-high", "Home"],
            ["accounts", "fa-users-gear", "Users"],
            ["jobs", "fa-briefcase", "Jobs"],
            ["reports", "fa-shield-halved", "Reports"],
            ["settings", "fa-gear", "Me"],
        ],
        sidebarExtras: `<div class="mock-trust-card"><i class="fa-solid fa-shield-check"></i><div><strong>${isSuperAdminUser() ? "Super admin" : "Staff workspace"}</strong><p>${escapeHtml(roleDescription())}</p></div></div>`,
        fabView: isOpsUser() ? "validation" : "support",
        fabIcon: isOpsUser() ? "fa-clipboard-check" : "fa-headset",
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

            if (document.querySelector("[data-feed-compose]") && !loadedStaffFeed) {
                loadedStaffFeed = true;
                import("./kaila-api.js").then(({ loadFeed }) => loadFeed().catch(() => {}));
            }
            if (document.querySelector("[data-refresh-analytics]") && !loadedStaffAnalytics) {
                loadedStaffAnalytics = true;
                loadAnalytics().catch(() => {});
            }
            bindAdminActions(toast);
        },
    });
}

function bindAdminActions(toast) {
    document.querySelector("[data-admin-account-new]")?.addEventListener("click", () => openAccountModal(null, toast));
    document.querySelectorAll("[data-admin-account-edit]").forEach((button) => {
        button.addEventListener("click", () => openAccountModal(adminUsers().find((user) => String(user.id) === button.dataset.adminAccountEdit), toast));
    });
    document.querySelectorAll("[data-admin-account-status]").forEach((button) => {
        button.addEventListener("click", async () => {
            try {
                await adminUserStatus(button.dataset.adminAccountStatus, button.dataset.status, button.dataset.status === "active" ? "Reactivated by admin." : "Updated by admin.");
                toast("Account updated.");
            } catch (error) {
                toast(error.message);
            }
        });
    });
    document.querySelectorAll("[data-admin-report-status]").forEach((button) => {
        button.addEventListener("click", async () => {
            try {
                await adminReportAction(button.dataset.adminReportStatus, button.dataset.status, "Reviewed in admin console.");
                toast("Report updated.");
            } catch (error) {
                toast(error.message);
            }
        });
    });
    document.querySelectorAll("[data-admin-job-action]").forEach((button) => {
        button.addEventListener("click", async () => {
            try {
                await jobAction(button.dataset.requestId, button.dataset.adminJobAction, { revision_note: "Updated by support.", dispute_note: "Reviewed by support." });
                toast("Job updated.");
            } catch (error) {
                toast(error.message);
            }
        });
    });
    document.querySelectorAll("[data-admin-feed-delete]").forEach((button) => {
        button.addEventListener("click", async () => {
            try {
                await deleteFeedPost(button.dataset.adminFeedDelete);
                toast("Feed post removed.");
            } catch (error) {
                toast(error.message);
            }
        });
    });
    document.querySelectorAll("[data-validation-delete]").forEach((button) => {
        button.addEventListener("click", async () => {
            try {
                await deleteValidationEntry(button.dataset.validationDelete);
                toast("Validation entry deleted.");
            } catch (error) {
                toast(error.message);
            }
        });
    });
    document.querySelectorAll("[data-validation-signal]").forEach((button) => {
        button.addEventListener("click", async () => {
            try {
                await updateValidationEntry(button.dataset.validationSignal, { decision_signal: button.dataset.signal });
                toast("Validation signal updated.");
            } catch (error) {
                toast(error.message);
            }
        });
    });
    document.querySelectorAll("[data-admin-filter-role]").forEach((button) => {
        button.addEventListener("click", () => {
            const role = button.dataset.adminFilterRole;
            document.querySelectorAll("[data-admin-account-card]").forEach((cardEl) => {
                cardEl.hidden = role !== "all" && cardEl.dataset.role !== role;
            });
        });
    });
}

function openAccountModal(user, toast) {
    const isNew = !user;
    const modal = document.createElement("div");
    modal.className = "admin-modal-backdrop";
    modal.innerHTML = `
        <form class="admin-modal" data-admin-account-form>
            <header><strong>${isNew ? "Create account" : "Edit account"}</strong><button type="button" data-admin-modal-close><i class="fa-solid fa-xmark"></i></button></header>
            <label>Name<input name="name" value="${escapeHtml(user?.name || "")}" required></label>
            <label>Username<input name="username" value="${escapeHtml(user?.username || "")}" ${isNew ? "required" : "disabled"}></label>
            <label>Email<input name="email" type="email" value="${escapeHtml(user?.email || "")}"></label>
            <label>Role<select name="role">${["client", "provider", "customer_service", "ops", "admin"].map((role) => `<option value="${role}" ${user?.role === role ? "selected" : ""}>${roleLabel(role)}</option>`).join("")}</select></label>
            <label>Area<input name="area" value="${escapeHtml(user?.area || "")}"></label>
            <label>Category<input name="category" value="${escapeHtml(user?.category || user?.provider_profile?.category || "")}"></label>
            <label>Password ${isNew ? "" : "<small>Leave blank to keep current password</small>"}<input name="password" type="password" minlength="8"></label>
            <div class="admin-modal__actions">
                <button class="btn btn-light" type="button" data-admin-modal-close>Cancel</button>
                <button class="btn btn-primary" type="submit">${isNew ? "Create" : "Save changes"}</button>
            </div>
        </form>`;
    document.body.appendChild(modal);
    modal.querySelectorAll("[data-admin-modal-close]").forEach((button) => button.addEventListener("click", () => modal.remove()));
    modal.querySelector("[data-admin-account-form]").addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        if (!data.password) delete data.password;
        try {
            if (isNew) {
                await adminCreateUser(data);
            } else {
                delete data.username;
                await adminUpdateUser(user.id, data);
            }
            toast(isNew ? "Account created." : "Account updated.");
            modal.remove();
        } catch (error) {
            toast(error.message);
        }
    });
}

function staffMetrics() {
    return store.metrics?.staff || {};
}

function adminUsers() {
    return store.admin?.users || [];
}

function adminKpi(label, value, iconName, tone) {
    return `<article class="admin-kpi admin-kpi--${tone}"><i class="fa-solid ${iconName}"></i><strong>${value}</strong><span>${escapeHtml(label)}</span></article>`;
}

function adminToolbar(title, subtitle, actions = "") {
    return `<div class="admin-toolbar"><div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div><div>${actions}</div></div>`;
}

function adminPanel(title, body) {
    return card(`<div class="admin-panel-head"><h2>${escapeHtml(title)}</h2></div>${body}`);
}

function quickLink(title, sub, view, iconName) {
    return `<button class="admin-quick-link" type="button" data-view-link="${view}"><i class="fa-solid ${iconName}"></i><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(sub)}</small></span></button>`;
}

function requestRows(requests, withActions = false) {
    return requests.map((request) => `
        <article class="admin-list-card">
            <span class="admin-list-card__icon"><i class="fa-solid fa-briefcase"></i></span>
            <div>
                <strong>${escapeHtml(requestTitle(request))}</strong>
                <small>${escapeHtml(request.category || "")} · ${escapeHtml(request.status || "")} · ${escapeHtml(formatBudget(request))}</small>
                <small>${escapeHtml(request.client?.name || "Client")} ${request.accepted_provider ? `→ ${escapeHtml(request.accepted_provider.name)}` : ""}</small>
            </div>
            ${withActions ? `<div class="admin-card-actions">${jobActions(request)}</div>` : ""}
        </article>`).join("") || emptyState("No jobs found.");
}

function jobActions(request) {
    if (isAdminUser()) return "";
    if (!isCustomerServiceUser()) return "";
    const actions = [];
    if (request.status === "Disputed") {
        actions.push(["resolve_dispute", "Resolve"]);
    }
    if (request.status === "Provider Marked Done") actions.push(["client_complete", "Release"]);
    if (["Posted", "Offers Received", "Countered", "Accepted"].includes(request.status)) actions.push(["cancel", "Cancel"]);
    return actions.map(([action, label]) => `<button class="btn btn-sm btn-outline-primary" type="button" data-request-id="${request.id}" data-admin-job-action="${action}">${label}</button>`).join("");
}

function accountCard(user) {
    const status = user.account_status || "active";
    return `<article class="admin-list-card" data-admin-account-card data-role="${escapeHtml(user.role || "")}">
        <span class="admin-list-card__icon"><i class="fa-solid fa-user"></i></span>
        <div>
            <strong>${escapeHtml(user.name || user.username || "User")} ${String(user.username || "").toLowerCase() === "jmaeacido" ? roleBadge("super_admin") : ""}</strong>
            <small>@${escapeHtml(user.username || "user")} · ${roleBadge(user.role)} · ${escapeHtml(status)}</small>
            <small>${escapeHtml(user.email || "No email")} ${user.area ? `· ${escapeHtml(user.area)}` : ""}</small>
        </div>
        <div class="admin-card-actions">${accountActions(user)}</div>
    </article>`;
}

function accountActions(user) {
    if (!canManageAccount(user)) return `<span class="text-muted small">Locked</span>`;
    return `
        <button class="btn btn-sm btn-outline-primary" type="button" data-admin-account-edit="${user.id}">Edit</button>
        <button class="btn btn-sm btn-outline-success" type="button" data-admin-account-status="${user.id}" data-status="active">Activate</button>
        <button class="btn btn-sm btn-outline-warning" type="button" data-admin-account-status="${user.id}" data-status="suspended">Suspend</button>
        <button class="btn btn-sm btn-outline-danger" type="button" data-admin-account-status="${user.id}" data-status="banned">Ban</button>
        ${isSuperAdminUser() && user.username !== "jmaeacido" ? `<button class="btn btn-sm btn-danger" type="button" data-admin-account-status="${user.id}" data-status="deleted">Delete</button>` : ""}`;
}

function providerCard(user) {
    const profile = user.provider_profile || {};
    return `<article class="admin-list-card">
        <span class="admin-list-card__icon"><i class="fa-solid fa-screwdriver-wrench"></i></span>
        <div>
            <strong>${escapeHtml(profile.display_name || user.name || "Provider")}</strong>
            <small>${escapeHtml(profile.category || user.category || "Service")} · ${escapeHtml(profile.status || user.account_status || "Active")}</small>
            <small>${escapeHtml(profile.coverage_area || user.area || "No coverage set")}</small>
        </div>
        <div class="admin-card-actions">${canManageAccount(user) ? `<button class="btn btn-sm btn-outline-primary" type="button" data-admin-account-edit="${user.id}">Edit</button>` : ""}</div>
    </article>`;
}

function clientCard(user) {
    const requests = store.requests.filter((request) => request.client_id === user.id);
    return `<article class="admin-list-card">
        <span class="admin-list-card__icon"><i class="fa-solid fa-user-group"></i></span>
        <div>
            <strong>${escapeHtml(user.name || user.username || "Client")}</strong>
            <small>${requests.length} requests · ${escapeHtml(user.account_status || "active")}</small>
            <small>${escapeHtml(user.area || "No area set")}</small>
        </div>
        <div class="admin-card-actions">${isAdminUser() ? accountActions(user) : `<button class="btn btn-sm btn-outline-primary" type="button" data-admin-support-contact="${user.id}">Message</button>`}</div>
    </article>`;
}

function reportCard(report) {
    return `<article class="admin-list-card">
        <span class="admin-list-card__icon admin-list-card__icon--warning"><i class="fa-solid fa-shield-halved"></i></span>
        <div>
            <strong>${escapeHtml(report.reason || "Report")} ${roleBadge(report.status || "Open")}</strong>
            <small>${escapeHtml(report.type || "report")} · by ${escapeHtml(report.reporter_name || report.reporter_username || "User")} · ${timeAgo(report.updated_at)}</small>
            <small>${escapeHtml(report.details || "No details provided.")}</small>
        </div>
        <div class="admin-card-actions">
            ${["Open", "In Review", "Closed"].map((status) => `<button class="btn btn-sm btn-outline-primary" type="button" data-admin-report-status="${report.id}" data-status="${status}">${status}</button>`).join("")}
        </div>
    </article>`;
}

function validationEntryCard(entry) {
    const name = entry.responses?.name || entry.responses?.client_name || entry.responses?.provider_name || "Validation entry";
    return `<article class="admin-list-card">
        <span class="admin-list-card__icon"><i class="fa-solid fa-clipboard-check"></i></span>
        <div>
            <strong>${escapeHtml(name)} ${roleBadge(entry.decision_signal || "Neutral")}</strong>
            <small>${escapeHtml(entry.type || "")} · ${escapeHtml(entry.operator_name || "KAILA")} · ${timeAgo(entry.updated_at)}</small>
            <small>${escapeHtml(entry.decision_reason || "No decision reason yet.")}</small>
        </div>
        <div class="admin-card-actions">
            ${["Approve", "Neutral", "Reject"].map((signal) => `<button class="btn btn-sm btn-outline-primary" type="button" data-validation-signal="${entry.id}" data-signal="${signal}">${signal}</button>`).join("")}
            <button class="btn btn-sm btn-outline-danger" type="button" data-validation-delete="${entry.id}">Delete</button>
        </div>
    </article>`;
}

function notificationRow(item) {
    return `<div class="mock-home-request"><span class="mock-thumb"><i class="fa-solid fa-bell"></i></span><span class="mock-home-request__body"><strong>${escapeHtml(item.title || item.type)}</strong><small>${escapeHtml(item.body || "")}</small></span></div>`;
}

function auditRows() {
    const logs = store.admin?.auditLogs || [];
    return logs.map((log) => `<div class="admin-audit-row"><strong>${escapeHtml(log.action)}</strong><small>${escapeHtml(log.actor_name || log.actor_username || "System")} · ${timeAgo(log.created_at)}</small></div>`).join("") || emptyState("No audit activity yet.");
}

function roleScopeHtml() {
    if (isSuperAdminUser()) return `<p class="text-muted mb-0">Full control over marketplace users and staff accounts, except the protected super-admin identity.</p>`;
    if (isAdminUser()) return `<p class="text-muted mb-0">Admin operations, marketplace moderation, reports, validation, and non-admin user management.</p>`;
    if (isCustomerServiceUser()) return `<p class="text-muted mb-0">Support desk, reports, customer conversations, and dispute support.</p>`;
    return `<p class="text-muted mb-0">Validation surveys and provider/client interview workflows only.</p>`;
}

function roleDescription() {
    if (isSuperAdminUser()) return "Complete admin control.";
    if (isAdminUser()) return "Marketplace admin tools.";
    if (isCustomerServiceUser()) return "Support and reports.";
    return "Validation workspace.";
}

function roleBadge(value = "") {
    const label = roleLabel(value);
    return `<span class="admin-role-badge">${escapeHtml(label)}</span>`;
}

function roleLabel(value = "") {
    return value === "all" ? "All" : value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function lockedScreen(message) {
    return card(`<div class="text-center py-5"><i class="fa-solid fa-lock fa-2x text-muted mb-3"></i><h2 class="h5">Restricted module</h2><p class="text-muted mb-0">${escapeHtml(message)}</p></div>`);
}

function emptyState(message) {
    return `<p class="mock-empty">${escapeHtml(message)}</p>`;
}

function peso(value) {
    return `₱${Number(value || 0).toLocaleString()}`;
}
