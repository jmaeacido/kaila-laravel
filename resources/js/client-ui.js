import {
    acceptOffer,
    blockUser,
    clientMetrics,
    clientRequests,
    createRequest,
    deleteAccount,
    formatBudget,
    jobAction,
    loadDirectMessages,
    loadJobMessages,
    markNotificationsRead,
    providerForRequest,
    refreshState,
    reportJob,
    reportUser,
    saveProfile,
    selectRequest,
    selectedRequest,
    sendDirectMessage,
    sendJobMessage,
    startNavigation,
    statusTone,
    store,
    timeAgo,
    requestTitle,
    offerCount,
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
    toast,
} from "./kaila-ui-core.js";

const area = () => store.user?.area || "Your area";
const categories = () => store.categories || [];
const urgencies = () => store.urgencies || [];

const navItems = [
    ["home", "Home", "bi-house-door", "/home"],
    ["requests", "My Requests", "bi-card-checklist", "/jobs"],
    ["post", "Post Request", "bi-plus-square", "/post"],
    ["inbox", "Inbox", "bi-chat-dots", "/messages"],
    ["notifications", "Activity", "bi-bell", "/notifications"],
    ["settings", "Settings", "bi-gear", "/settings"],
    ["offers", "Offers", "bi-columns-gap", "/jobs#offers"],
    ["detail", "Job Detail", "bi-briefcase", "/jobs#detail"],
    ["chat", "Job Chat", "bi-chat-left-text", "/messages#chat"],
    ["call", "Call", "bi-camera-video", "/messages#call"],
    ["tracking", "Tracking", "bi-geo-alt", "/jobs#tracking"],
    ["completion", "Completion", "bi-check2-circle", "/jobs#completion"],
    ["rating", "Rating", "bi-star", "/jobs#rating"],
    ["dispute", "Dispute", "bi-flag", "/support#dispute"],
    ["block", "Block", "bi-shield-exclamation", "/support#block"],
    ["support", "Support", "bi-headset", "/support"],
    ["delete", "Delete", "bi-trash3", "/settings#delete"],
];

const routeViews = {
    "/home": "home",
    "/post": "post",
    "/jobs": "requests",
    "/messages": "inbox",
    "/notifications": "notifications",
    "/settings": "settings",
    "/support": "support",
};

const subtitles = {
    home: "What service do you need today?",
    post: "Tell providers what you need done.",
    requests: "Track every service request in one place.",
    offers: "Compare provider offers before hiring.",
    detail: "Accepted job details and next steps.",
    inbox: "Job conversations and support threads.",
    support: "Help from the KAILA team.",
    notifications: "Recent marketplace activity.",
    settings: "Profile, preferences, and account.",
};

function categoryIcon(category) {
    return ({
        Plumbing: "bi-droplet",
        Electrical: "bi-lightning",
        "Cleaning Services": "bi-bucket",
        Repair: "bi-tools",
    })[category] || "bi-wrench";
}

function currentJob() {
    return selectedRequest() || clientRequests()[0] || null;
}

function statCards() {
    const stats = clientMetrics();
    const items = [
        ["bi-send", stats.postedRequests, "Posted Requests"],
        ["bi-briefcase", stats.activeJobs, "Active Jobs"],
        ["bi-tag", stats.offersReceived, "Offers Received"],
        ["bi-check2-circle", stats.completedJobs, "Completed Jobs"],
        ["bi-star", stats.averageRating || "—", "Avg. Rating"],
    ];
    return `<div class="kaila-grid kaila-grid-5">${items.map(([ic, value, label]) => card(`
        <div class="kaila-stat">
            <span class="kaila-stat__icon" style="background:rgba(8,117,190,0.1);color:var(--kaila-blue)">${icon(ic)}</span>
            <div class="kaila-stat__value">${value}</div>
            <div class="kaila-stat__label">${label}</div>
        </div>
    `, "kaila-card--accent")).join("")}</div>`;
}

function requestRow(item, linkView = "detail") {
    const tone = statusTone(item.status);
    const label = item.status === "Offers Received" ? `${offerCount(item)} OFFERS` : item.status.toUpperCase();
    return `
        <button class="kaila-list-item" type="button" data-select-request="${item.id}" data-view-link="${linkView}">
            <span class="kaila-list-item__thumb">${icon(categoryIcon(item.category))}</span>
            <span class="kaila-list-item__body">
                <p class="kaila-list-item__title">${escapeHtml(requestTitle(item))}</p>
                <p class="kaila-list-item__meta">${escapeHtml(item.area)} · ${timeAgo(item.created_at)}</p>
            </span>
            <span class="kaila-list-item__end">${pill(label, tone)}<div style="margin-top:6px;font-weight:700;font-size:0.82rem">${formatBudget(item)}</div></span>
            ${icon("bi-chevron-right")}
        </button>`;
}

function jobSummary(job) {
    if (!job) return card(`<p class="kaila-empty">Select a request to view details.</p>`);
    const provider = providerForRequest(job);
    return card(`
        <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap">
            <div>
                ${pill(job.status, statusTone(job.status))}
                <h3 style="margin:10px 0 4px;font-size:1.05rem">${escapeHtml(requestTitle(job))}</h3>
                <p style="margin:0;color:var(--kaila-muted);font-size:0.88rem">${escapeHtml(job.area)} · ${escapeHtml(job.preferred_schedule || "Flexible schedule")}</p>
            </div>
            <div style="text-align:right">
                <div style="font-weight:800">${formatBudget(job)}</div>
                <div style="color:var(--kaila-muted);font-size:0.82rem">${escapeHtml(provider?.name || "Matching providers")}</div>
            </div>
        </div>`);
}

const screens = {
    home() {
        const recent = clientRequests().slice(0, 3);
        return `
            <p style="font-size:1.35rem;font-weight:800;margin:0 0 18px">${greeting()}, ${escapeHtml(firstName(store.user?.name))}! 👋</p>
            ${statCards()}
            <div style="height:18px"></div>
            <div class="kaila-grid kaila-grid-4">
                <button class="kaila-action-card kaila-action-card--primary" type="button" data-view-link="post">
                    <span class="kaila-action-card__icon">${icon("bi-plus-lg")}</span>
                    <span class="kaila-action-card__title">Post Request</span>
                    <span class="kaila-action-card__sub">Get offers</span>
                </button>
                ${[["offers", "bi-tags", "View Offers"], ["inbox", "bi-chat-dots", "Messages"], ["support", "bi-headset", "Support"]].map(([view, ic, title]) => `
                    <button class="kaila-action-card" type="button" data-view-link="${view}">
                        <span class="kaila-action-card__icon">${icon(ic)}</span>
                        <span class="kaila-action-card__title">${title}</span>
                    </button>`).join("")}
            </div>
            <div style="height:18px"></div>
            ${card(`${sectionHead("Your Recent Requests", `<button class="kaila-btn kaila-btn--ghost" type="button" data-view-link="requests">View all</button>`)}
                ${recent.length ? recent.map((item) => requestRow(item, item.offers?.length ? "offers" : "detail")).join("") : `<p class="kaila-empty">No requests yet. Post your first service need.</p>`}`)}
        `;
    },
    post() {
        return card(`
            <h2 style="margin:0 0 6px">Post a Service Request</h2>
            <form data-client-post class="kaila-grid" style="margin-top:16px">
                <div class="kaila-field"><label>Service category</label><select class="kaila-select" name="category" required>${categories().map((item) => `<option>${escapeHtml(item)}</option>`).join("")}</select></div>
                <div class="kaila-field"><label>Urgency</label><select class="kaila-select" name="urgency" required>${urgencies().map((item) => `<option>${escapeHtml(item)}</option>`).join("")}</select></div>
                <div class="kaila-field"><label>Service area</label><input class="kaila-input" name="area" value="${escapeHtml(area())}" required></div>
                <div class="kaila-field"><label>Budget</label><input class="kaila-input" name="budget" placeholder="PHP 500-1500"></div>
                <div class="kaila-field"><label>Preferred schedule</label><input class="kaila-input" name="preferred_schedule" placeholder="Today after 4 PM"></div>
                <div class="kaila-field"><label>Request details</label><textarea class="kaila-textarea" name="details" required minlength="10" placeholder="Describe what you need done"></textarea></div>
                <label style="display:flex;gap:8px;font-size:0.88rem"><input type="checkbox" name="permission_to_forward" checked> Allow providers to see enough detail to quote accurately.</label>
                <button class="kaila-btn kaila-btn--primary kaila-btn--lg" type="submit">${icon("bi-send")} Post Request</button>
            </form>
        `);
    },
    requests() {
        const items = clientRequests();
        return card(`
            ${sectionHead("My Requests", `<button class="kaila-btn kaila-btn--primary" type="button" data-view-link="post">${icon("bi-plus")} New request</button>`)}
            ${items.length ? items.map((item) => requestRow(item, item.offers?.length ? "offers" : "detail")).join("") : `<p class="kaila-empty">No requests yet.</p>`}
        `);
    },
    offers() {
        const job = currentJob();
        const offers = job?.offers || [];
        return `<div class="kaila-layout-2-wide"><div>
            ${jobSummary(job)}
            ${offers.length ? offers.map((offer) => card(`
                <div class="kaila-offer-row">
                    <div style="display:flex;gap:12px;align-items:center">${avatar(offer.provider?.name)}<div><strong>${escapeHtml(offer.provider?.name || "Provider")}</strong><div style="font-size:0.82rem;color:var(--kaila-muted)">${escapeHtml(offer.amount)} · ${escapeHtml(offer.schedule || "Flexible")}</div></div></div>
                    <div>${pill(offer.status || "pending", "blue")}</div>
                    <div><button class="kaila-btn kaila-btn--primary" type="button" data-accept-offer="${offer.id}">Accept offer</button></div>
                </div>
            `)).join("") : card(`<p class="kaila-empty">No offers yet for this request.</p>`)}
        </div><aside>${card(`<p style="color:var(--kaila-muted)">Compare price, schedule, and provider notes before accepting.</p>`)}</aside></div>`;
    },
    detail() {
        const job = currentJob();
        const provider = providerForRequest(job);
        return `<div class="kaila-layout-2-wide"><div>
            ${jobSummary(job)}
            ${card(`<p style="color:var(--kaila-muted)">${escapeHtml(job?.details || "No details provided.")}</p>`)}
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
                ${job?.status === "Provider Marked Done" ? `<button class="kaila-btn kaila-btn--success" type="button" data-job-action="client_complete">Confirm complete</button>` : ""}
                ${job?.status === "Provider Marked Done" ? `<button class="kaila-btn kaila-btn--outline" type="button" data-job-action="request_revision">Request revision</button>` : ""}
                ${job?.status === "Payment Released" ? `<button class="kaila-btn kaila-btn--primary" type="button" data-view-link="rating">Rate provider</button>` : ""}
            </div>
        </div><aside>${provider ? card(`
            <h3 style="margin:0 0 12px">Provider</h3>
            <div style="display:grid;gap:8px">
                <button class="kaila-btn kaila-btn--primary kaila-btn--block" type="button" data-view-link="chat">${icon("bi-chat-dots")} Message</button>
                <button class="kaila-btn kaila-btn--outline kaila-btn--block" type="button" data-view-link="tracking">${icon("bi-geo-alt")} Track travel</button>
            </div>
        `) : ""}</aside></div>`;
    },
    chat() {
        const job = currentJob();
        const messages = store.jobMessages;
        return card(`
            <div style="margin-bottom:12px"><strong>${escapeHtml(providerForRequest(job)?.name || "Job chat")}</strong></div>
            <div class="kaila-chat__messages">${messages.map((message) => `<div class="kaila-bubble ${message.sender_id === store.user?.id ? "kaila-bubble--out" : "kaila-bubble--in"}">${escapeHtml(message.body)}</div>`).join("") || `<p class="kaila-empty">No messages yet.</p>`}</div>
            <form data-client-chat style="display:flex;gap:8px;margin-top:12px"><input class="kaila-input" name="body" placeholder="Write a job message" required><button class="kaila-btn kaila-btn--primary" type="submit">${icon("bi-send")}</button></form>
        `);
    },
    call() {
        return card(`<div class="kaila-call">${avatar(providerForRequest(currentJob())?.name || "Pro")}<h3 style="margin:16px 0 6px">Voice / video call</h3><p style="opacity:0.72">WebRTC signaling can be enabled with the RTC config endpoint.</p></div>`);
    },
    tracking() {
        const job = currentJob();
        const nav = job?.navigation_state;
        return card(`
            <div class="kaila-map">${icon("bi-map", "fs-1")}<h3 style="margin:12px 0 6px">Live provider route</h3>
            <p style="margin:0;color:var(--kaila-muted)">${nav?.distance_meters ? `${Math.round(nav.distance_meters / 100) / 10} km away` : "Waiting for provider travel update"} · ETA ${nav?.eta_minutes || "—"} min</p></div>
        `);
    },
    completion() {
        return screens.detail();
    },
    rating() {
        const job = currentJob();
        return card(`
            <form data-client-rate>
                <div style="text-align:center;margin-bottom:14px">${avatar(providerForRequest(job)?.name)}<h2 style="margin:12px 0 6px">Rate Your Provider</h2></div>
                <div class="kaila-field"><label>Score (1-5)</label><input class="kaila-input" name="score" type="number" min="1" max="5" value="5"></div>
                <div class="kaila-field"><label>Review</label><textarea class="kaila-textarea" name="note"></textarea></div>
                <button class="kaila-btn kaila-btn--success kaila-btn--block" type="submit">Submit rating</button>
            </form>
        `);
    },
    dispute() {
        const job = currentJob();
        return card(`
            <form data-client-dispute>
                <div class="kaila-field"><label>Reason</label><input class="kaila-input" name="reason" required></div>
                <div class="kaila-field"><label>Details</label><textarea class="kaila-textarea" name="details"></textarea></div>
                <button class="kaila-btn kaila-btn--danger kaila-btn--block" type="submit">Send report</button>
            </form>
            <input type="hidden" name="request_id" value="${job?.id || ""}">
        `);
    },
    block() {
        const job = currentJob();
        const provider = providerForRequest(job);
        return card(`
            <form data-client-block>
                <p style="color:var(--kaila-muted)">Block ${escapeHtml(provider?.name || "this user")} and alert support.</p>
                <div class="kaila-field"><label>Reason</label><input class="kaila-input" name="reason" required></div>
                <div class="kaila-field"><label>Details</label><textarea class="kaila-textarea" name="details"></textarea></div>
                <button class="kaila-btn kaila-btn--danger kaila-btn--block" type="submit">Block and report</button>
            </form>
        `);
    },
    inbox() {
        const threads = clientRequests().filter((item) => item.messages?.length || ["Accepted", "In Progress", "Provider Marked Done", "Revision Requested"].includes(item.status));
        return card(`
            ${sectionHead("Inbox")}
            ${threads.map((item) => requestRow(item, "chat")).join("") || `<p class="kaila-empty">Accepted job conversations will appear here.</p>`}
        `);
    },
    support() {
        const messages = store.directMessages;
        return card(`
            <div class="kaila-chat__messages">${messages.map((message) => `<div class="kaila-bubble ${message.sender_id === store.user?.id ? "kaila-bubble--out" : "kaila-bubble--in"}">${escapeHtml(message.body)}</div>`).join("") || `<p class="kaila-empty">Message KAILA Support for help.</p>`}</div>
            <form data-client-support style="display:flex;gap:8px;margin-top:12px"><input class="kaila-input" name="body" placeholder="Message KAILA Support" required><button class="kaila-btn kaila-btn--primary" type="submit">${icon("bi-send")}</button></form>
        `);
    },
    notifications() {
        const items = store.notifications || [];
        return card(`
            ${sectionHead("Recent Activity", `<button class="kaila-btn kaila-btn--outline" type="button" data-mark-notifications>Mark read</button>`)}
            ${items.length ? items.map((item) => `
                <div class="kaila-list-item">
                    <span class="kaila-list-item__thumb">${icon("bi-bell")}</span>
                    <span class="kaila-list-item__body"><p class="kaila-list-item__title">${escapeHtml(item.title || item.type)}</p><p class="kaila-list-item__meta">${escapeHtml(item.body || "")} · ${timeAgo(item.created_at)}</p></span>
                </div>
            `).join("") : `<p class="kaila-empty">No notifications yet.</p>`}
        `);
    },
    settings() {
        return `<div class="kaila-layout-2-wide"><div>${card(`
            <form data-client-profile>
                <div class="kaila-grid kaila-grid-2">
                    <div class="kaila-field"><label>Full name</label><input class="kaila-input" name="name" value="${escapeHtml(store.user?.name || "")}"></div>
                    <div class="kaila-field"><label>Phone</label><input class="kaila-input" name="contact_number" value="${escapeHtml(store.user?.contact_number || "")}"></div>
                    <div class="kaila-field" style="grid-column:1/-1"><label>Default area</label><input class="kaila-input" name="area" value="${escapeHtml(store.user?.area || "")}"></div>
                </div>
                <button class="kaila-btn kaila-btn--primary" type="submit">Save changes</button>
            </form>
        `)}</div><aside>${card(`
            <div style="display:grid;gap:8px">
                <button class="kaila-btn kaila-btn--outline kaila-btn--block" type="button" data-view-link="support">${icon("bi-headset")} Contact support</button>
                <button class="kaila-btn kaila-btn--outline kaila-btn--block" type="button" data-view-link="delete">${icon("bi-trash3")} Delete account</button>
                <button class="kaila-btn kaila-btn--danger kaila-btn--block" data-logout>${icon("bi-box-arrow-right")} Logout</button>
            </div>
        `)}</aside></div>`;
    },
    delete() {
        return card(`
            <form data-client-delete>
                <p style="color:var(--kaila-muted)">Type DELETE to confirm account deletion.</p>
                <div class="kaila-field"><label>Confirmation</label><input class="kaila-input" name="confirm" required></div>
                <button class="kaila-btn kaila-btn--danger" type="submit">Request account deletion</button>
            </form>
        `);
    },
};

createApp({
    theme: "client",
    navItems,
    routeViews,
    screens,
    storeActions: { selectRequest },
    bottomNav: [
        ["home", "bi-house-door", "Home"],
        ["requests", "bi-card-checklist", "Jobs"],
        ["post", "bi-plus-square", "Post"],
        ["inbox", "bi-chat-dots", "Inbox"],
        ["settings", "bi-person", "Me"],
    ],
    sidebarExtras: `<div class="kaila-side-card">${icon("bi-shield-check")} <strong>You're in safe hands</strong> All providers are verified.</div>`,
    topbarExtra: `<button class="kaila-location-chip" type="button">${icon("bi-geo-alt-fill")} ${escapeHtml(area())}</button>`,
    getTitle: (view) => navItems.find(([id]) => id === view)?.[1] || "Home",
    getSubtitle: (view) => subtitles[view] || subtitles.home,
    bindScreenActions({ navigate, toast: showToast }) {
        document.querySelector("[data-client-post]")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const form = event.target;
            const body = Object.fromEntries(new FormData(form));
            body.permission_to_forward = form.permission_to_forward?.checked ?? true;
            try {
                await createRequest(body);
                showToast("Request posted.");
                navigate("requests");
            } catch (error) {
                showToast(error.message);
            }
        });

        document.querySelectorAll("[data-accept-offer]").forEach((button) => {
            button.addEventListener("click", async () => {
                const job = currentJob();
                if (!job) return;
                try {
                    await acceptOffer(job.id, button.dataset.acceptOffer);
                    showToast("Offer accepted.");
                    navigate("detail");
                } catch (error) {
                    showToast(error.message);
                }
            });
        });

        document.querySelectorAll("[data-job-action]").forEach((button) => {
            button.addEventListener("click", async () => {
                const job = currentJob();
                if (!job) return;
                try {
                    await jobAction(job.id, button.dataset.jobAction);
                    showToast("Job updated.");
                } catch (error) {
                    showToast(error.message);
                }
            });
        });

        document.querySelector("[data-client-chat]")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const job = currentJob();
            if (!job) return;
            const body = new FormData(event.target).get("body");
            try {
                await sendJobMessage(job.id, body);
                event.target.reset();
            } catch (error) {
                showToast(error.message);
            }
        });

        document.querySelector("[data-client-rate]")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const job = currentJob();
            if (!job) return;
            const data = Object.fromEntries(new FormData(event.target));
            try {
                await jobAction(job.id, "rate", { score: Number(data.score), note: data.note });
                showToast("Rating submitted.");
                navigate("home");
            } catch (error) {
                showToast(error.message);
            }
        });

        document.querySelector("[data-client-dispute]")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const job = currentJob();
            if (!job) return;
            const data = Object.fromEntries(new FormData(event.target));
            try {
                await reportJob(job.id, data.reason, data.details);
                showToast("Report sent to support.");
            } catch (error) {
                showToast(error.message);
            }
        });

        document.querySelector("[data-client-block]")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const provider = providerForRequest(currentJob());
            if (!provider) return;
            const data = Object.fromEntries(new FormData(event.target));
            try {
                await blockUser(provider.id, data.reason);
                await reportUser(provider.id, data.reason, data.details);
                showToast("User blocked and reported.");
            } catch (error) {
                showToast(error.message);
            }
        });

        document.querySelector("[data-client-profile]")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            try {
                await saveProfile(Object.fromEntries(new FormData(event.target)));
                showToast("Profile saved.");
            } catch (error) {
                showToast(error.message);
            }
        });

        document.querySelector("[data-client-delete]")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const confirm = new FormData(event.target).get("confirm");
            try {
                await deleteAccount(confirm);
            } catch (error) {
                showToast(error.message);
            }
        });

        document.querySelector("[data-client-support]")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const support = store.supportDesk;
            if (!support) return showToast("Support desk is unavailable.");
            const body = new FormData(event.target).get("body");
            try {
                await sendDirectMessage(support.id, body);
                event.target.reset();
            } catch (error) {
                showToast(error.message);
            }
        });

        document.querySelector("[data-mark-notifications]")?.addEventListener("click", async () => {
            try {
                await markNotificationsRead();
                showToast("Notifications marked read.");
            } catch (error) {
                showToast(error.message);
            }
        });

        const job = currentJob();
        if (job && ["chat"].includes(document.querySelector("[data-screen]") ? "" : "")) {
            loadJobMessages(job.id).catch(() => {});
        }
        if (document.querySelector("[data-client-chat]") && job) {
            loadJobMessages(job.id).catch(() => {});
        }
        if (document.querySelector("[data-client-support]") && store.supportDesk) {
            loadDirectMessages(store.supportDesk.id).catch(() => {});
        }
    },
});
