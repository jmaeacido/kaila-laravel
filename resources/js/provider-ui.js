import {
    jobAction,
    loadDirectMessages,
    loadJobMessages,
    matchingRequests,
    passRequest,
    providerActiveJobs,
    providerMetrics,
    providerOffersSent,
    refreshState,
    reportUser,
    saveProfile,
    saveProvider,
    selectRequest,
    selectedRequest,
    sendDirectMessage,
    sendJobMessage,
    sendOffer,
    startNavigation,
    statusTone,
    store,
    timeAgo,
    requestTitle,
    formatBudget,
} from "./kaila-api.js";
import {
    avatar,
    card,
    createApp,
    escapeHtml,
    firstName,
    greeting,
    icon,
    pill,
    sectionHead,
} from "./kaila-ui-core.js";

const providerName = () => store.user?.name || "Provider";
const specialties = () => store.user?.provider_profile?.category || store.user?.category || "Services";
const area = () => store.user?.area || store.user?.provider_profile?.area || "Your area";
const categories = () => store.categories || [];

const navItems = [
    ["home", "Dashboard", "bi-speedometer2", "/home"],
    ["requests", "Matching Requests", "bi-search", "/requests"],
    ["jobs", "Active Jobs", "bi-briefcase", "/jobs"],
    ["offers", "Offers Sent", "bi-send", "/jobs#offers"],
    ["inbox", "Inbox", "bi-chat-dots", "/messages"],
    ["notifications", "Activity", "bi-bell", "/notifications"],
    ["settings", "Settings", "bi-gear", "/settings"],
    ["detail", "Request Detail", "bi-file-text", "/requests#detail"],
    ["send-offer", "Send Offer", "bi-tag", "/requests#send-offer"],
    ["job-detail", "Accepted Job", "bi-clipboard-check", "/jobs#detail"],
    ["chat", "Job Chat", "bi-chat-left-text", "/messages#chat"],
    ["travel", "Travel", "bi-geo-alt", "/jobs#travel"],
    ["in-progress", "In Progress", "bi-play-circle", "/jobs#in-progress"],
    ["mark-done", "Mark Done", "bi-check-circle", "/jobs#mark-done"],
    ["rate-client", "Rate Client", "bi-star-half", "/jobs#rate-client"],
    ["support", "Support", "bi-headset", "/support"],
    ["profile", "My Profile", "bi-person-badge", "/settings#profile"],
    ["delete", "Delete Account", "bi-trash3", "/settings#delete"],
];

const routeViews = {
    "/home": "home",
    "/requests": "requests",
    "/jobs": "jobs",
    "/messages": "inbox",
    "/notifications": "notifications",
    "/settings": "settings",
    "/support": "support",
};

const subtitles = {
    home: "Here's what's happening with your business today.",
    requests: "Open requests that match your services and area.",
    jobs: "Jobs you are currently working on.",
    inbox: "Client conversations and support threads.",
    settings: "Profile, availability, and account preferences.",
    support: "Help from the KAILA provider team.",
    notifications: "Recent job and offer activity.",
};

function currentJob() {
    return selectedRequest() || providerActiveJobs()[0] || matchingRequests()[0] || null;
}

function statCards() {
    const stats = providerMetrics();
    const items = [
        ["bi-people", stats.matchingRequests, "Matching Requests"],
        ["bi-send", stats.offersSent, "Offers Sent"],
        ["bi-check-circle", stats.acceptedJobs, "Accepted Jobs"],
        ["bi-briefcase", stats.activeJobs, "Active Jobs"],
        ["bi-clipboard-check", stats.completedJobs, "Completed Jobs"],
        ["bi-star", stats.averageRating || "—", "Average Rating"],
    ];
    return `<div class="kaila-grid kaila-grid-6">${items.map(([ic, value, label]) => card(`
        <div class="kaila-stat">
            <span class="kaila-stat__icon" style="background:rgba(8,117,190,0.1);color:var(--kaila-blue)">${icon(ic)}</span>
            <div class="kaila-stat__value">${value}</div>
            <div class="kaila-stat__label">${label}</div>
        </div>
    `)).join("")}</div>`;
}

function requestCard(item) {
    return card(`
        <div class="kaila-request-card">
            <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
                <div><strong>${escapeHtml(item.client?.name || "Client")}</strong><div style="font-size:0.82rem;color:var(--kaila-muted)">${escapeHtml(item.category)} · ${timeAgo(item.created_at)}</div></div>
                ${pill(item.status, statusTone(item.status))}
            </div>
            <strong style="display:block;margin:10px 0 4px">${escapeHtml(requestTitle(item))}</strong>
            <p style="margin:0 0 10px;color:var(--kaila-muted);font-size:0.88rem">${escapeHtml(item.details || "").slice(0, 140)}</p>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
                <span style="color:var(--kaila-green);font-weight:800">${formatBudget(item)}</span>
                <div style="display:flex;gap:8px">
                    <button class="kaila-btn kaila-btn--outline" type="button" data-select-request="${item.id}" data-view-link="detail">View</button>
                    <button class="kaila-btn kaila-btn--outline" type="button" data-pass-request="${item.id}">Pass</button>
                    <button class="kaila-btn kaila-btn--primary" type="button" data-select-request="${item.id}" data-view-link="send-offer">Send Offer</button>
                </div>
            </div>
        </div>
    `, "kaila-card--flat");
}

function jobRow(item) {
    return `
        <button class="kaila-list-item" type="button" data-select-request="${item.id}" data-view-link="job-detail">
            <span class="kaila-list-item__thumb">${icon("bi-briefcase")}</span>
            <span class="kaila-list-item__body"><p class="kaila-list-item__title">${escapeHtml(requestTitle(item))}</p><p class="kaila-list-item__meta">${escapeHtml(item.area)}</p></span>
            <span class="kaila-list-item__end">${pill(item.status, statusTone(item.status))}</span>
        </button>`;
}

const screens = {
    home() {
        const matching = matchingRequests().slice(0, 2);
        const active = providerActiveJobs().slice(0, 2);
        return `
            <p style="font-size:1.35rem;font-weight:800;margin:0 0 18px">${greeting()}, ${escapeHtml(firstName(providerName()))}! 👋</p>
            ${statCards()}
            <div style="height:18px"></div>
            <div class="kaila-grid kaila-grid-2">
                <div>${sectionHead("Latest Matching Requests", `<button class="kaila-btn kaila-btn--ghost" type="button" data-view-link="requests">View all</button>`)}
                    ${matching.length ? matching.map(requestCard).join("") : `<p class="kaila-empty">No matching requests right now.</p>`}</div>
                <div>${sectionHead("Active Jobs")}${active.length ? active.map(jobRow).join("") : `<p class="kaila-empty">No active jobs.</p>`}</div>
            </div>`;
    },
    requests() {
        const items = matchingRequests();
        return `${sectionHead("Matching Requests", `<button class="kaila-location-chip" type="button">${icon("bi-geo-alt-fill")} ${escapeHtml(area())}</button>`)}
            ${items.length ? items.map(requestCard).join("") : `<p class="kaila-empty">No open requests in your category.</p>`}`;
    },
    jobs() {
        const items = providerActiveJobs();
        return card(`${sectionHead("Active Jobs")}${items.length ? items.map(jobRow).join("") : `<p class="kaila-empty">No active jobs.</p>`}`);
    },
    offers() {
        const offers = providerOffersSent();
        return card(`${sectionHead("Offers Sent")}${offers.length ? offers.map(({ request, ...offer }) => `
            <div class="kaila-list-item">
                <span class="kaila-list-item__body"><p class="kaila-list-item__title">${escapeHtml(requestTitle(request))}</p><p class="kaila-list-item__meta">${escapeHtml(offer.amount)} · ${escapeHtml(offer.status || "pending")}</p></span>
            </div>
        `).join("") : `<p class="kaila-empty">No offers sent yet.</p>`}`);
    },
    detail() {
        const job = currentJob();
        return card(`
            ${job ? `<strong>${escapeHtml(requestTitle(job))}</strong><p style="color:var(--kaila-muted)">${escapeHtml(job.details || "")}</p>
            <div style="display:flex;gap:8px;margin-top:12px">
                <button class="kaila-btn kaila-btn--outline" type="button" data-pass-request="${job.id}">Pass</button>
                <button class="kaila-btn kaila-btn--primary" type="button" data-view-link="send-offer">Send Offer</button>
            </div>` : `<p class="kaila-empty">Select a request.</p>`}
        `);
    },
    "send-offer"() {
        const job = currentJob();
        return card(`
            <form data-provider-offer>
                <p style="color:var(--kaila-muted);margin-top:0">${escapeHtml(requestTitle(job))}</p>
                <div class="kaila-field"><label>Your price</label><input class="kaila-input" name="amount" required placeholder="PHP 950"></div>
                <div class="kaila-field"><label>Schedule</label><input class="kaila-input" name="schedule" placeholder="Today 4 PM"></div>
                <div class="kaila-field"><label>Message</label><textarea class="kaila-textarea" name="notes"></textarea></div>
                <button class="kaila-btn kaila-btn--primary kaila-btn--lg" type="submit">${icon("bi-send")} Send Offer</button>
            </form>
        `);
    },
    "job-detail"() {
        const job = currentJob();
        return card(`
            ${job ? `<strong>${escapeHtml(requestTitle(job))}</strong><p style="color:var(--kaila-muted)">${escapeHtml(job.area)} · ${escapeHtml(job.status)}</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
                ${job.status === "Accepted" || job.status === "Revision Requested" ? `<button class="kaila-btn kaila-btn--primary" type="button" data-job-action="start">Start job</button>` : ""}
                ${job.status === "In Progress" || job.status === "Revision Requested" ? `<button class="kaila-btn kaila-btn--outline" type="button" data-view-link="mark-done">Mark done</button>` : ""}
                <button class="kaila-btn kaila-btn--outline" type="button" data-view-link="chat">Message</button>
                <button class="kaila-btn kaila-btn--outline" type="button" data-nav-start="${job.id}">Start navigation</button>
            </div>` : `<p class="kaila-empty">Select a job.</p>`}
        `);
    },
    chat() {
        const job = currentJob();
        const messages = store.jobMessages;
        return card(`
            <div class="kaila-chat__messages">${messages.map((message) => `<div class="kaila-bubble ${message.sender_id === store.user?.id ? "kaila-bubble--out" : "kaila-bubble--in"}">${escapeHtml(message.body)}</div>`).join("") || `<p class="kaila-empty">No messages yet.</p>`}</div>
            <form data-provider-chat style="display:flex;gap:8px;margin-top:12px"><input class="kaila-input" name="body" required placeholder="Write a job message"><button class="kaila-btn kaila-btn--primary" type="submit">${icon("bi-send")}</button></form>
        `);
    },
    travel() {
        const job = currentJob();
        const nav = job?.navigation_state;
        return card(`<div class="kaila-map">${icon("bi-map", "fs-1")}<h3 style="margin:12px 0 6px">Travel / Navigation</h3><p style="color:var(--kaila-muted)">${nav?.distance_meters ? `${Math.round(nav.distance_meters / 100) / 10} km` : "Navigation not started"} · ETA ${nav?.eta_minutes || "—"} min</p></div>`);
    },
    "mark-done"() {
        return card(`
            <form data-provider-complete>
                <div class="kaila-field"><label>Completion notes</label><textarea class="kaila-textarea" name="proof_note" required></textarea></div>
                <button class="kaila-btn kaila-btn--success kaila-btn--lg" type="submit">${icon("bi-check2")} Submit completion</button>
            </form>
        `);
    },
    "rate-client"() {
        return card(`
            <form data-provider-rate>
                <div class="kaila-field"><label>Score (1-5)</label><input class="kaila-input" name="score" type="number" min="1" max="5" value="5"></div>
                <div class="kaila-field"><label>Review</label><textarea class="kaila-textarea" name="note"></textarea></div>
                <button class="kaila-btn kaila-btn--success kaila-btn--block" type="submit">Submit rating</button>
            </form>
        `);
    },
    inbox() {
        const threads = providerActiveJobs();
        return card(`${sectionHead("Provider Inbox")}${threads.length ? threads.map(jobRow).join("") : `<p class="kaila-empty">Accepted job conversations will appear here.</p>`}`);
    },
    support() {
        const messages = store.directMessages;
        return card(`
            <div class="kaila-chat__messages">${messages.map((message) => `<div class="kaila-bubble ${message.sender_id === store.user?.id ? "kaila-bubble--out" : "kaila-bubble--in"}">${escapeHtml(message.body)}</div>`).join("") || `<p class="kaila-empty">Message provider support.</p>`}</div>
            <form data-provider-support style="display:flex;gap:8px;margin-top:12px"><input class="kaila-input" name="body" required placeholder="Message provider support"><button class="kaila-btn kaila-btn--primary" type="submit">${icon("bi-send")}</button></form>
        `);
    },
    notifications() {
        const items = store.notifications || [];
        return card(`${sectionHead("Activity")}${items.length ? items.map((item) => `
            <div class="kaila-list-item"><span class="kaila-list-item__body"><p class="kaila-list-item__title">${escapeHtml(item.title || item.type)}</p><p class="kaila-list-item__meta">${escapeHtml(item.body || "")}</p></span></div>
        `).join("") : `<p class="kaila-empty">No activity yet.</p>`}`);
    },
    settings() {
        const profile = store.user?.provider_profile || {};
        return `<div class="kaila-layout-2-wide"><div>${card(`
            <form data-provider-profile>
                <div class="kaila-grid kaila-grid-2">
                    <div class="kaila-field"><label>Display name</label><input class="kaila-input" name="display_name" value="${escapeHtml(profile.display_name || providerName())}"></div>
                    <div class="kaila-field"><label>Category</label><select class="kaila-select" name="category">${categories().map((item) => `<option ${item === (profile.category || specialties()) ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}</select></div>
                    <div class="kaila-field"><label>Service area</label><input class="kaila-input" name="area" value="${escapeHtml(profile.area || area())}"></div>
                    <div class="kaila-field"><label>Availability</label><input class="kaila-input" name="availability" value="${escapeHtml(profile.availability || "Available")}"></div>
                    <div class="kaila-field" style="grid-column:1/-1"><label>Services offered</label><textarea class="kaila-textarea" name="specific_services">${escapeHtml(profile.specific_services || "")}</textarea></div>
                </div>
                <input type="hidden" name="rules_agreement" value="1">
                <button class="kaila-btn kaila-btn--primary" type="submit">Save profile</button>
            </form>
        `)}</div><aside>${card(`<button class="kaila-btn kaila-btn--danger kaila-btn--block" data-logout>${icon("bi-box-arrow-right")} Logout</button>`)}</aside></div>`;
    },
    profile() {
        return screens.settings();
    },
    delete() {
        return card(`<form data-provider-delete><div class="kaila-field"><label>Type DELETE</label><input class="kaila-input" name="confirm" required></div><button class="kaila-btn kaila-btn--danger" type="submit">Delete account</button></form>`);
    },
};

createApp({
    theme: "provider",
    navItems,
    routeViews,
    screens,
    storeActions: { selectRequest },
    sidebarProfile: `
        <div class="kaila-sidebar__profile">
            ${avatar(providerName())}
            <div>
                <p class="kaila-sidebar__profile-name">${escapeHtml(providerName())}</p>
                <p class="kaila-sidebar__profile-meta">${escapeHtml(specialties())}</p>
                <span class="kaila-sidebar__status">Active</span>
            </div>
        </div>`,
    sidebarExtras: `
        <div class="kaila-side-card">${icon("bi-check-circle")} <strong>Profile Status: Active</strong> You are receiving matching requests.</div>
        <button class="kaila-btn kaila-btn--primary kaila-btn--block" type="button" data-view-link="support">${icon("bi-headset")} Contact Support</button>`,
    bottomNav: [
        ["requests", "bi-search", "Requests"],
        ["jobs", "bi-briefcase", "Jobs"],
        ["inbox", "bi-chat-dots", "Inbox"],
        ["notifications", "bi-bell", "Activity"],
        ["settings", "bi-gear", "Settings"],
    ],
    getTitle: (view) => navItems.find(([id]) => id === view)?.[1] || "Dashboard",
    getSubtitle: (view) => subtitles[view] || subtitles.home,
    bindScreenActions({ navigate, toast: showToast }) {
        document.querySelectorAll("[data-pass-request]").forEach((button) => {
            button.addEventListener("click", async () => {
                try {
                    await passRequest(button.dataset.passRequest);
                    showToast("Request passed.");
                } catch (error) {
                    showToast(error.message);
                }
            });
        });

        document.querySelector("[data-provider-offer]")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const job = currentJob();
            if (!job) return;
            const data = Object.fromEntries(new FormData(event.target));
            try {
                await sendOffer(job.id, data);
                showToast("Offer sent.");
                navigate("offers");
            } catch (error) {
                showToast(error.message);
            }
        });

        document.querySelectorAll("[data-job-action]").forEach((button) => {
            button.addEventListener("click", async () => {
                const job = currentJob();
                if (!job) return;
                try {
                    await jobAction(job.id, button.dataset.jobAction);
                    showToast("Job updated.");
                    navigate("job-detail");
                } catch (error) {
                    showToast(error.message);
                }
            });
        });

        document.querySelector("[data-provider-complete]")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const job = currentJob();
            if (!job) return;
            const data = Object.fromEntries(new FormData(event.target));
            try {
                await jobAction(job.id, "provider_complete", data);
                showToast("Completion submitted.");
                navigate("jobs");
            } catch (error) {
                showToast(error.message);
            }
        });

        document.querySelector("[data-provider-rate]")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const job = currentJob();
            if (!job) return;
            const data = Object.fromEntries(new FormData(event.target));
            try {
                await jobAction(job.id, "rate", { score: Number(data.score), note: data.note });
                showToast("Rating submitted.");
            } catch (error) {
                showToast(error.message);
            }
        });

        document.querySelector("[data-provider-profile]")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            try {
                await saveProvider(Object.fromEntries(new FormData(event.target)));
                showToast("Profile saved.");
            } catch (error) {
                showToast(error.message);
            }
        });

        document.querySelector("[data-provider-chat]")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const job = currentJob();
            if (!job) return;
            try {
                await sendJobMessage(job.id, new FormData(event.target).get("body"));
                event.target.reset();
            } catch (error) {
                showToast(error.message);
            }
        });

        document.querySelector("[data-provider-support]")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const support = store.supportDesk;
            if (!support) return showToast("Support desk unavailable.");
            try {
                await sendDirectMessage(support.id, new FormData(event.target).get("body"));
                event.target.reset();
            } catch (error) {
                showToast(error.message);
            }
        });

        document.querySelectorAll("[data-nav-start]").forEach((button) => {
            button.addEventListener("click", async () => {
                try {
                    await startNavigation(button.dataset.navStart);
                    showToast("Navigation started.");
                    navigate("travel");
                } catch (error) {
                    showToast(error.message);
                }
            });
        });

        document.querySelector("[data-provider-delete]")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const { deleteAccount } = await import("./kaila-api.js");
            try {
                await deleteAccount(new FormData(event.target).get("confirm"));
            } catch (error) {
                showToast(error.message);
            }
        });

        const job = currentJob();
        if (document.querySelector("[data-provider-chat]") && job) {
            loadJobMessages(job.id).catch(() => {});
        }
        if (document.querySelector("[data-provider-support]") && store.supportDesk) {
            loadDirectMessages(store.supportDesk.id).catch(() => {});
        }
    },
});
