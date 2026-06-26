import {
    acceptOffer,
    blockUser,
    clientMetrics,
    clientRequests,
    createRequest,
    deleteAccount,
    formatBudget,
    isStaffUser,
    jobAction,
    loadDirectMessages,
    loadFeed,
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
import { attachmentsFromForm, renderAttachments } from "./kaila-media.js";
import {
    acceptCall,
    bindRemoteMedia,
    endCall,
    getActiveCall,
    hangupCall,
    rejectCall,
    startCall,
} from "./kaila-webrtc.js";
import {
    analyticsScreen,
    assistantScreen,
    bindAssistantActions,
    bindFeedActions,
    bindStaffActions,
    feedScreen,
    validationScreen,
} from "./kaila-shared-screens.js";
import {
    clientQuickActions,
    clientStatRow,
    mockCategoryPills,
    mockHomeRequestRow,
    mockInboxShell,
    mockPageHero,
    mockPostRequestForm,
    mockRequestListCard,
    mockSearchBar,
} from "./kaila-mock-ui.js";
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

const area = () => store.user?.area || "Your area";
const categories = () => store.categories || [];
const urgencies = () => store.urgencies || [];

const navItems = [
    ["home", "Home", "fa-house", "/home"],
    ["feed", "Feed", "fa-rss", "/feed"],
    ["providers", "Providers", "fa-user-group", "/home#providers"],
    ["inbox", "Inbox", "fa-comment-dots", "/messages"],
    ["notifications", "Activity", "fa-clock-rotate-left", "/notifications"],
    ["settings", "Settings", "fa-gear", "/settings"],
    ["requests", "My Requests", "fa-clipboard-list", "/jobs"],
    ["post", "Post Request", "fa-square-plus", "/post"],
    ["assistant", "Katabang", "fa-wand-magic-sparkles", "/assistant"],
    ["offers", "Offers", "fa-tags", "/jobs#offers"],
    ["detail", "Job Detail", "fa-briefcase", "/jobs#detail"],
    ["chat", "Job Chat", "fa-comments", "/messages#chat"],
    ["call", "Call", "fa-video", "/messages#call"],
    ["tracking", "Tracking", "fa-location-dot", "/jobs#tracking"],
    ["completion", "Completion", "fa-circle-check", "/jobs#completion"],
    ["rating", "Rating", "fa-star", "/jobs#rating"],
    ["dispute", "Dispute", "fa-flag", "/support#dispute"],
    ["block", "Block", "fa-shield-halved", "/support#block"],
    ["support", "Support", "fa-headset", "/support"],
    ["analytics", "Analytics", "fa-chart-line", "/settings#analytics"],
    ["validation", "Validation", "fa-clipboard-check", "/settings#validation"],
    ["delete", "Delete", "fa-trash", "/settings#delete"],
];

const routeViews = {
    "/home": "home",
    "/post": "post",
    "/jobs": "requests",
    "/feed": "feed",
    "/messages": "inbox",
    "/assistant": "assistant",
    "/notifications": "notifications",
    "/settings": "settings",
    "/support": "support",
};

const subtitles = {
    home: "What service do you need today?",
    post: "Tell providers what you need done.",
    requests: "Manage all your service requests in one place.",
    offers: "Compare provider offers before hiring.",
    detail: "Accepted job details and next steps.",
    inbox: "All your conversations in one place.",
    support: "Help from the KAILA team.",
    notifications: "Recent marketplace activity.",
    settings: "Profile, preferences, and account.",
    feed: "Community updates from clients and providers.",
    assistant: "Ask Katabang for marketplace guidance.",
};

function currentJob() {
    return selectedRequest() || clientRequests()[0] || null;
}

function jobSummary(job) {
    if (!job) return card(`<p class="kaila-empty">Select a request to view details.</p>`);
    const provider = providerForRequest(job);
    return card(`
        <div class="d-flex justify-content-between gap-3 flex-wrap">
            <div>
                ${pill(job.status, statusTone(job.status))}
                <h3 class="mt-2 mb-1">${escapeHtml(requestTitle(job))}</h3>
                <p class="text-muted mb-0">${escapeHtml(job.area)} · ${escapeHtml(job.preferred_schedule || "Flexible schedule")}</p>
            </div>
            <div class="text-end">
                <div class="fw-bold fs-5">${formatBudget(job)}</div>
                <div class="text-muted small">${escapeHtml(provider?.name || "Matching providers")}</div>
            </div>
        </div>
        <div class="d-flex gap-2 flex-wrap mt-3">
            <button class="btn btn-primary btn-sm" type="button" data-view-link="chat"><i class="fa-solid fa-comment-dots"></i> Message</button>
            <button class="btn btn-outline-primary btn-sm" type="button" data-view-link="tracking"><i class="fa-solid fa-location-dot"></i> Track travel</button>
        </div>`);
}

const screens = {
    home() {
        const recent = clientRequests().slice(0, 3);
        const stats = clientMetrics();
        return `
            ${mockPageHero("", subtitles.home, store.user?.name)}
            ${clientStatRow(stats)}
            <div class="mock-home-section">${clientQuickActions(store.unreadNotifications || 0)}</div>
            <div class="mock-home-section">${mockSearchBar()}</div>
            <div class="mock-home-section">${mockCategoryPills(categories())}</div>
            <div class="mock-home-section kaila-card">
                ${sectionHead("Your Recent Requests", `<button class="mock-link-btn" type="button" data-view-link="requests">View all <i class="fa-solid fa-chevron-right"></i></button>`)}
                ${recent.length ? recent.map((item) => mockHomeRequestRow(item, item.offers?.length ? "offers" : "detail")).join("") : `<p class="mock-empty">No requests yet. Post your first service need.</p>`}
            </div>
        `;
    },
    providers() {
        const items = store.providers || [];
        return `
            ${mockPageHero("Providers", "Browse verified providers in your area.")}
            ${items.length ? `<div class="mock-provider-grid">${items.map((provider) => `
                <div class="mock-provider-card">
                    ${avatar(provider.name)}
                    <div>
                        <strong>${escapeHtml(provider.name)}</strong>
                        <small>${escapeHtml(provider.provider_profile?.category || provider.category || "Services")} · ${escapeHtml(provider.area || area())}</small>
                    </div>
                </div>`).join("")}</div>` : card(`<p class="mock-empty">No providers listed yet.</p>`)}
        `;
    },
    post() {
        return `
            ${mockPageHero("Post a Service Request", subtitles.post)}
            ${mockPostRequestForm(categories(), urgencies(), area())}
        `;
    },
    requests() {
        const items = clientRequests();
        return `
            ${mockPageHero("My Requests", subtitles.requests)}
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <div class="mock-filter-tabs">
                    <button class="mock-filter-tab active" type="button">All (${items.length})</button>
                    <button class="mock-filter-tab" type="button">Open</button>
                    <button class="mock-filter-tab" type="button">Active</button>
                    <button class="mock-filter-tab" type="button">Completed</button>
                </div>
                <button class="btn btn-primary" type="button" data-view-link="post"><i class="fa-solid fa-plus"></i> Post Request</button>
            </div>
            ${items.length ? items.map((item) => mockRequestListCard(item, item.offers?.length ? "offers" : "detail")).join("") : `<div class="kaila-card"><p class="mock-empty">No requests yet.</p></div>`}
        `;
    },
    offers() {
        const job = currentJob();
        const offers = job?.offers || [];
        return `
            ${mockPageHero("Compare Offers", subtitles.offers)}
            ${jobSummary(job)}
            <div class="mt-3">
            ${offers.length ? offers.map((offer) => card(`
                <div class="d-flex justify-content-between align-items-center gap-3 flex-wrap">
                    <div class="d-flex gap-3 align-items-center">
                        ${avatar(offer.provider?.name)}
                        <div>
                            <strong>${escapeHtml(offer.provider?.name || "Provider")}</strong>
                            <div class="text-muted small">${escapeHtml(offer.amount)} · ${escapeHtml(offer.schedule || "Flexible")}</div>
                        </div>
                    </div>
                    <button class="btn btn-primary" type="button" data-accept-offer="${offer.id}">Accept offer</button>
                </div>
            `)).join("") : card(`<p class="mock-empty">No offers yet for this request.</p>`)}
            </div>`;
    },
    detail() {
        const job = currentJob();
        return `
            ${mockPageHero("Job Details", subtitles.detail)}
            <div class="row g-4">
                <div class="col-lg-8">${jobSummary(job)}${card(`<p class="text-muted mb-0">${escapeHtml(job?.details || "No details provided.")}</p>`)}</div>
                <div class="col-lg-4">${card(`
                    <h3 class="h6">Actions</h3>
                    <div class="d-grid gap-2">
                        ${job?.status === "Provider Marked Done" ? `<button class="btn btn-success" type="button" data-job-action="client_complete">Confirm complete</button>` : ""}
                        ${job?.status === "Provider Marked Done" ? `<button class="btn btn-outline-warning" type="button" data-job-action="request_revision">Request revision</button>` : ""}
                        ${job?.status === "Payment Released" ? `<button class="btn btn-primary" type="button" data-view-link="rating">Rate provider</button>` : ""}
                    </div>
                `)}</div>
            </div>`;
    },
    inbox() {
        const threads = clientRequests().filter((item) => item.messages?.length || ["Accepted", "In Progress", "Provider Marked Done", "Revision Requested"].includes(item.status));
        const job = currentJob();
        return mockInboxShell({
            threads,
            messages: store.jobMessages,
            activeTitle: providerForRequest(job)?.name || "Select a conversation",
            activeSub: job ? requestTitle(job) : "Job conversations",
            composeAttr: "data-client-chat",
        });
    },
    chat() {
        return screens.inbox();
    },
    call() {
        const job = currentJob();
        const peer = providerForRequest(job);
        const incoming = store.incomingCall;
        return card(`
            <div class="mock-chat-panel text-center p-4" data-call-shell>
                ${avatar(peer?.name || incoming?.senderName || "Contact", "", peer?.social_photo_url || "")}
                <h3 class="mt-3">${incoming ? `Incoming call from ${escapeHtml(incoming.senderName || "KAILA user")}` : "Voice / video call"}</h3>
                <p class="text-muted">${incoming ? "Answer to connect securely over WebRTC." : "Start a call from job chat when both users are online."}</p>
                <div class="d-flex justify-content-center gap-2 flex-wrap">
                    ${incoming ? `
                        <button class="btn btn-success" type="button" data-accept-call"><i class="fa-solid fa-phone"></i> Accept</button>
                        <button class="btn btn-danger" type="button" data-reject-call"><i class="fa-solid fa-phone-slash"></i> Decline</button>
                    ` : getActiveCall() ? `
                        <button class="btn btn-danger" type="button" data-hangup-call"><i class="fa-solid fa-phone-slash"></i> End call</button>
                    ` : peer ? `
                        <button class="btn btn-primary" type="button" data-start-call="${peer.id}"><i class="fa-solid fa-video"></i> Start call</button>
                    ` : ""}
                </div>
            </div>`);
    },
    tracking() {
        const job = currentJob();
        const nav = job?.navigation_state;
        return card(`
            <div class="text-center py-5">
                <i class="fa-solid fa-map-location-dot fa-3x text-primary mb-3"></i>
                <h3>Live provider route</h3>
                <p class="text-muted">${nav?.distance_meters ? `${Math.round(nav.distance_meters / 100) / 10} km away` : "Waiting for provider travel update"} · ETA ${nav?.eta_minutes || "—"} min</p>
            </div>`);
    },
    completion() { return screens.detail(); },
    rating() {
        const job = currentJob();
        return card(`
            <form data-client-rate class="text-center">
                ${avatar(providerForRequest(job)?.name)}
                <h2 class="mt-3">Rate Your Provider</h2>
                <div class="row g-3 text-start mt-2">
                    <div class="col-md-6"><label class="form-label">Score (1-5)</label><input class="form-control" name="score" type="number" min="1" max="5" value="5"></div>
                    <div class="col-12"><label class="form-label">Review</label><textarea class="form-control" name="note"></textarea></div>
                </div>
                <button class="btn btn-success w-100 mt-3" type="submit">Submit rating</button>
            </form>`);
    },
    dispute() {
        return card(`
            <form data-client-dispute>
                <h2 class="h4">Report / Dispute Job</h2>
                <div class="mb-3"><label class="form-label">Reason</label><input class="form-control" name="reason" required></div>
                <div class="mb-3"><label class="form-label">Details</label><textarea class="form-control" name="details"></textarea></div>
                <button class="btn btn-danger w-100" type="submit">Send report</button>
            </form>`);
    },
    block() {
        const provider = providerForRequest(currentJob());
        return card(`
            <form data-client-block>
                <p class="text-muted">Block ${escapeHtml(provider?.name || "this user")} and alert support.</p>
                <div class="mb-3"><label class="form-label">Reason</label><input class="form-control" name="reason" required></div>
                <div class="mb-3"><label class="form-label">Details</label><textarea class="form-control" name="details"></textarea></div>
                <button class="btn btn-danger w-100" type="submit">Block and report</button>
            </form>`);
    },
    support() {
        const messages = store.directMessages;
        return card(`
            <div class="mock-chat-panel__messages mb-3">${messages.map((message) => `<div class="mock-chat-bubble ${message.sender_id === store.user?.id ? "out" : "in"}">${escapeHtml(message.body)}${renderAttachments(message.attachments)}</div>`).join("") || `<p class="mock-empty">Message KAILA Support for help.</p>`}</div>
            <form data-client-support class="mock-chat-compose">
                <button type="button"><i class="fa-solid fa-paperclip"></i></button>
                <input class="form-control" name="body" placeholder="Message KAILA Support" required>
                <button class="mock-send-btn" type="submit"><i class="fa-solid fa-paper-plane"></i></button>
            </form>`);
    },
    notifications() {
        const items = store.notifications || [];
        return `
            ${mockPageHero("Activity", subtitles.notifications)}
            ${card(`
                ${sectionHead("Recent Activity", `<button class="btn btn-outline-primary btn-sm" type="button" data-mark-notifications">Mark read</button>`)}
                ${items.length ? items.map((item) => `
                    <div class="mock-home-request">
                        <span class="mock-thumb"><i class="fa-solid fa-bell"></i></span>
                        <span class="mock-home-request__body">
                            <strong>${escapeHtml(item.title || item.type)}</strong>
                            <small>${escapeHtml(item.body || "")} · ${timeAgo(item.created_at)}</small>
                        </span>
                    </div>`).join("") : `<p class="mock-empty">No notifications yet.</p>`}
            `)}`;
    },
    settings() {
        return `
            ${mockPageHero("Profile & Settings", subtitles.settings)}
            <div class="row g-4">
                <div class="col-lg-8">${card(`
                    <form data-client-profile>
                        <div class="row g-3">
                            <div class="col-md-6"><label class="form-label">Full name</label><input class="form-control" name="name" value="${escapeHtml(store.user?.name || "")}"></div>
                            <div class="col-md-6"><label class="form-label">Phone</label><input class="form-control" name="contact_number" value="${escapeHtml(store.user?.contact_number || "")}"></div>
                            <div class="col-12"><label class="form-label">Default area</label><input class="form-control" name="area" value="${escapeHtml(store.user?.area || "")}"></div>
                        </div>
                        <button class="btn btn-primary mt-3" type="submit">Save changes</button>
                    </form>
                `)}</div>
                <div class="col-lg-4">${card(`
                    <div class="d-grid gap-2">
                        <button class="btn btn-outline-primary" type="button" data-view-link="support"><i class="fa-solid fa-headset"></i> Contact support</button>
                        ${isStaffUser() ? `<button class="btn btn-outline-primary" type="button" data-view-link="analytics"><i class="fa-solid fa-chart-line"></i> Analytics</button>` : ""}
                        ${isStaffUser() ? `<button class="btn btn-outline-primary" type="button" data-view-link="validation"><i class="fa-solid fa-clipboard-check"></i> Validation</button>` : ""}
                        <button class="btn btn-outline-secondary" type="button" data-view-link="delete"><i class="fa-solid fa-trash"></i> Delete account</button>
                        <button class="btn btn-danger" data-logout><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
                    </div>
                `)}</div>
            </div>`;
    },
    delete() {
        return card(`
            <form data-client-delete>
                <h2 class="h4">Delete account</h2>
                <p class="text-muted">Type DELETE to confirm account deletion.</p>
                <div class="mb-3"><label class="form-label">Confirmation</label><input class="form-control" name="confirm" required></div>
                <button class="btn btn-danger" type="submit">Request account deletion</button>
            </form>`);
    },
    feed: feedScreen,
    assistant: assistantScreen,
    analytics: analyticsScreen,
    validation: validationScreen,
};

export function initClientApp() {
    return createApp({
        role: "client",
        navItems: navItems.filter(([id]) => !["analytics", "validation"].includes(id) || isStaffUser()),
        routeViews,
        screens,
        storeActions: { selectRequest },
        sidebarPostButton: false,
        sidebarPromos: false,
        topbarSearch: false,
        bottomNav: [
            ["home", "fa-house", "Home"],
            ["feed", "fa-rss", "Feed"],
            ["providers", "fa-user-group", "Providers"],
            ["inbox", "fa-comment-dots", "Inbox"],
            ["notifications", "fa-clock-rotate-left", "Activity"],
            ["settings", "fa-gear", "Settings"],
        ],
        fabView: "support",
        fabIcon: "fa-comment-dots",
        getTitle: (view) => (view === "home" ? "" : navItems.find(([id]) => id === view)?.[1] || "Home"),
        getSubtitle: (view) => subtitles[view] || subtitles.home,
        bindScreenActions: bindClientScreenActions,
    });
}

function bindClientScreenActions({ navigate, toast: showToast }) {
    bindFeedActions({ toast: showToast });
    bindAssistantActions({ toast: showToast });
    if (isStaffUser()) bindStaffActions({ toast: showToast });

    document.querySelectorAll("[data-start-call]").forEach((button) => {
        button.addEventListener("click", async () => {
            const job = currentJob();
            try {
                await startCall({
                    targetUserId: Number(button.dataset.startCall),
                    requestId: job?.id || "",
                    withVideo: true,
                    senderName: store.user?.name,
                });
                showToast("Calling...");
                navigate("call");
            } catch (error) {
                showToast(error.message);
            }
        });
    });

    document.querySelector("[data-accept-call]")?.addEventListener("click", async () => {
        try {
            const call = await acceptCall(store.incomingCall);
            store.incomingCall = null;
            bindRemoteMedia(document.querySelector("[data-call-shell]"), call.stream);
            showToast("Call connected.");
        } catch (error) {
            showToast(error.message);
        }
    });

    document.querySelector("[data-reject-call]")?.addEventListener("click", async () => {
        if (store.incomingCall) await rejectCall(store.incomingCall);
        store.incomingCall = null;
        endCall();
        showToast("Call declined.");
    });

    document.querySelector("[data-hangup-call]")?.addEventListener("click", async () => {
        await hangupCall();
        showToast("Call ended.");
    });

    document.querySelector("[data-client-post]")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.target;
        const body = Object.fromEntries(new FormData(form));
        body.permission_to_forward = form.permission_to_forward?.checked ?? true;
        try {
            body.attachments = await attachmentsFromForm(form);
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
        const form = event.target;
        const body = new FormData(form).get("body");
        try {
            const attachments = await attachmentsFromForm(form);
            await sendJobMessage(job.id, body || "[media]", attachments);
            form.reset();
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
        try {
            await deleteAccount(new FormData(event.target).get("confirm"));
        } catch (error) {
            showToast(error.message);
        }
    });

    document.querySelector("[data-client-support]")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const support = store.supportDesk;
        if (!support) return showToast("Support desk is unavailable.");
        const form = event.target;
        try {
            const attachments = await attachmentsFromForm(form);
            await sendDirectMessage(support.id, new FormData(form).get("body"), attachments);
            form.reset();
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
    if (document.querySelector("[data-client-chat]") && job) {
        loadJobMessages(job.id).catch(() => {});
    }
    if (document.querySelector("[data-client-support]") && store.supportDesk) {
        loadDirectMessages(store.supportDesk.id).catch(() => {});
    }
    if (document.querySelector("[data-feed-compose]")) {
        loadFeed().catch(() => {});
    }
    if (document.querySelector("[data-refresh-analytics]")) {
        import("./kaila-api.js").then(({ loadAnalytics }) => loadAnalytics().catch(() => {}));
    }
}
