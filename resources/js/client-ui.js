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
    initLocationPicker,
    renderRouteMap,
} from "./kaila-maps.js";
import {
    clientQuickActions,
    clientHomeFallbackRequests,
    clientStatRow,
    categoryTone,
    mockCategoryPills,
    mockHomeRequestRow,
    mockInboxShell,
    mockPageHero,
    mockPostRequestForm,
    mockRequestListCard,
    mockSearchBar,
    sidebarTrustCard,
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
let loadedClientJobMessagesFor = null;
let loadedClientSupportFor = null;
let loadedClientFeed = false;

const navItems = [
    ["home", "Home", "fa-house", "/home"],
    ["feed", "Feed", "fa-rss", "/feed"],
    ["providers", "Providers", "fa-user-group", "/home#providers"],
    ["requests", "My Requests", "fa-clipboard-list", "/jobs"],
    ["bookings", "Bookings", "fa-calendar-check", "/bookings"],
    ["inbox", "Messages", "fa-comment-dots", "/messages"],
    ["notifications", "Activity", "fa-clock-rotate-left", "/notifications"],
    ["favorites", "Favorites", "fa-heart", "/favorites"],
    ["payments", "Payments", "fa-credit-card", "/payments"],
    ["reviews", "Reviews", "fa-star", "/reviews"],
    ["saved-providers", "Saved Providers", "fa-shield-heart", "/saved-providers"],
    ["settings", "Settings", "fa-gear", "/settings"],
    ["support", "Help Center", "fa-circle-question", "/support"],
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
    ["support-detail", "Support", "fa-headset", "/support"],
    ["analytics", "Analytics", "fa-chart-line", "/settings#analytics"],
    ["validation", "Validation", "fa-clipboard-check", "/settings#validation"],
    ["delete", "Delete", "fa-trash", "/settings#delete"],
];

const routeViews = {
    "/home": "home",
    "/post": "post",
    "/jobs": "requests",
    "/bookings": "bookings",
    "/feed": "feed",
    "/messages": "inbox",
    "/assistant": "assistant",
    "/notifications": "notifications",
    "/favorites": "favorites",
    "/payments": "payments",
    "/reviews": "reviews",
    "/saved-providers": "saved-providers",
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
    bookings: "Track upcoming and completed bookings.",
    favorites: "Your saved posts, services, and providers.",
    payments: "Payment methods, receipts, and credits.",
    reviews: "Ratings and reviews from your service history.",
    "saved-providers": "Providers you trust and want to hire again.",
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

function settingsRow({ iconName, tone = "blue", label, value = "", sub = "", view = "", danger = false, badge = "" }) {
    const actionAttr = view ? `data-view-link="${view}"` : `data-toast="${escapeHtml(label)} settings are coming soon."`;
    return `
        <button class="settings-list-row ${danger ? "settings-list-row--danger" : ""}" type="button" ${actionAttr}>
            <span class="settings-list-row__icon settings-list-row__icon--${tone}"><i class="fa-solid ${iconName}"></i></span>
            <span class="settings-list-row__body">
                <strong>${escapeHtml(label)}</strong>
                ${sub ? `<small>${escapeHtml(sub)}</small>` : ""}
            </span>
            ${value ? `<em>${escapeHtml(value)}</em>` : ""}
            ${badge ? `<b>${escapeHtml(badge)}</b>` : ""}
            <i class="fa-solid fa-chevron-right settings-list-row__chev"></i>
        </button>`;
}

function settingsToggleRow({ iconName, tone, label, checked = true }) {
    return `
        <button class="settings-list-row" type="button" data-toast="${escapeHtml(label)} updated.">
            <span class="settings-list-row__icon settings-list-row__icon--${tone}"><i class="fa-solid ${iconName}"></i></span>
            <span class="settings-list-row__body"><strong>${escapeHtml(label)}</strong></span>
            <span class="settings-switch ${checked ? "is-on" : ""}" aria-hidden="true"><i></i></span>
            <i class="fa-solid fa-chevron-right settings-list-row__chev"></i>
        </button>`;
}

function settingsSection(title, rows) {
    return `
        <section class="settings-section-card">
            <h2>${escapeHtml(title)}</h2>
            <div class="settings-list">${rows.join("")}</div>
        </section>`;
}

function demoClientRequestsList() {
    return [
        {
            id: -201,
            title: "Fix leaking faucet in kitchen",
            description: "My kitchen faucet keeps leaking even when it's closed. Please bring tools and replacement parts if needed.",
            status: "Offers Received",
            statusLabel: "OFFERS RECEIVED",
            category: "Plumbing",
            icon: "fa-faucet-drip",
            area: "Makati City, Metro Manila",
            schedule: "May 26, 2025 · 1 PM - 5 PM",
            budget: "₱1,200",
            offers: "5",
            activity: "10 mins ago",
            mediaCount: 3,
            tone: "blue",
            actions: ["View Offers", "Edit Request", "Cancel Request"],
        },
        {
            id: -202,
            title: "Install additional outlet",
            description: "Need an additional outlet near the TV area including wiring and installation.",
            status: "Countered",
            statusLabel: "COUNTERED",
            category: "Electrical",
            icon: "fa-bolt",
            area: "Taguig City, Metro Manila",
            schedule: "May 27, 2025 · 9 AM - 12 PM",
            budget: "₱1,500",
            provider: "Mark Electrical",
            rating: "4.8",
            activity: "1 hour ago",
            mediaCount: 2,
            tone: "orange",
            actions: ["View Offers", "Chat with Provider", "View Details"],
        },
        {
            id: -203,
            title: "Home deep cleaning",
            description: "3-bedroom apartment deep cleaning including kitchen and bathrooms.",
            status: "In Progress",
            statusLabel: "IN PROGRESS",
            category: "Cleaning",
            icon: "fa-bucket",
            area: "Quezon City, Metro Manila",
            schedule: "May 24, 2025 · 8 AM - 12 PM",
            budget: "₱2,000",
            provider: "Liza Cleaning",
            rating: "4.9",
            activity: "20 mins ago",
            mediaCount: 2,
            tone: "cyan",
            progress: true,
            actions: ["Open Chat", "Track Provider"],
        },
        {
            id: -204,
            title: "Unclog toilet",
            description: "Toilet is clogged and water is not draining properly.",
            status: "Provider Marked Done",
            statusLabel: "PROVIDER MARKED DONE",
            category: "Repair",
            icon: "fa-screwdriver-wrench",
            area: "Pasig City, Metro Manila",
            schedule: "May 20, 2025 · 2 PM - 4 PM",
            budget: "₱1,000",
            provider: "Juan Plumbing",
            rating: "4.7",
            activity: "1 day ago",
            mediaCount: 1,
            tone: "green",
            actions: ["Chat with Provider", "Confirm Completion", "Request Revision"],
        },
        {
            id: -205,
            title: "Aircon not cooling properly",
            description: "AC is running but not cooling the room. Please check and repair.",
            status: "Rated / Closed",
            statusLabel: "RATED / CLOSED",
            category: "Appliance Repair",
            icon: "fa-fan",
            area: "Mandaluyong City, Metro Manila",
            schedule: "May 15, 2025 · 9 AM - 11 AM",
            budget: "₱1,800",
            provider: "Mike Aircon",
            rating: "4.9",
            activity: "3 days ago",
            mediaCount: 3,
            tone: "green",
            rated: true,
            actions: ["Rate Provider"],
        },
        {
            id: -206,
            title: "Wall repair and repaint",
            description: "The wall paint is peeling off and needs repainting.",
            status: "Disputed",
            statusLabel: "DISPUTED",
            category: "Painting",
            icon: "fa-paint-roller",
            area: "Manila City, Metro Manila",
            schedule: "May 18, 2025 · 1 PM - 5 PM",
            budget: "₱3,500",
            provider: "PaintPro Services",
            rating: "4.6",
            activity: "5 hours ago",
            mediaCount: 1,
            tone: "red",
            actions: ["Open Chat", "View Dispute", "Cancel Request"],
        },
    ];
}

function requestActionButton(label) {
    const styles = {
        "View Offers": ["offers", "fa-eye", "primary"],
        "Edit Request": ["detail", "fa-pen", "primary"],
        "Cancel Request": ["detail", "fa-xmark", "danger"],
        "Chat with Provider": ["chat", "fa-message", "primary"],
        "Open Chat": ["chat", "fa-message", "primary"],
        "View Details": ["detail", "fa-circle-info", "neutral"],
        "Track Provider": ["tracking", "fa-location-dot", "success"],
        "Confirm Completion": ["completion", "fa-check", "success"],
        "Request Revision": ["detail", "fa-clock-rotate-left", "warning"],
        "Rate Provider": ["rating", "fa-star", "success"],
        "View Dispute": ["dispute", "fa-triangle-exclamation", "danger"],
    };
    const [view, fa, tone] = styles[label] || ["detail", "fa-chevron-right", "neutral"];
    return `<button class="request-action request-action--${tone}" type="button" data-view-link="${view}"><i class="fa-solid ${fa}"></i> ${escapeHtml(label)}</button>`;
}

function requestListCard(item) {
    return `
        <article class="requests-list-card requests-list-card--${item.tone}">
            <div class="request-card-media">
                <span class="request-card-media__icon service-icon service-icon--${categoryTone(item.category)}"><i class="fa-solid ${item.icon}"></i></span>
                <span class="request-card-media__image service-visual service-visual--${categoryTone(item.category)}"><i class="fa-solid ${item.icon}"></i></span>
                <b><i class="fa-solid fa-camera"></i> ${item.mediaCount}</b>
            </div>
            <div class="request-card-main">
                <span class="request-status request-status--${item.tone}">${escapeHtml(item.statusLabel)}</span>
                <h2>${escapeHtml(item.title)}</h2>
                <p>${escapeHtml(item.description)}</p>
                <div class="request-meta-row">
                    <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.area)}</span>
                    <span><i class="fa-regular fa-calendar"></i> ${escapeHtml(item.schedule)}</span>
                </div>
                <div class="request-provider-row">
                    ${item.provider ? `${avatar(item.provider, "small")} <span>${escapeHtml(item.provider)} ${item.rating ? `<i class="fa-solid fa-star"></i> ${escapeHtml(item.rating)}` : ""}</span>` : `<span class="request-offers-note">${escapeHtml(item.offers || "0")} offers</span>`}
                </div>
            </div>
            <div class="request-card-side">
                <div class="request-budget">
                    <strong>${escapeHtml(item.budget)}</strong>
                    <span>Budget</span>
                    ${item.offers ? `<small>Offers<br><b>${escapeHtml(item.offers)}</b></small>` : ""}
                </div>
                <div class="request-activity">
                    <span>Last activity</span>
                    <strong><i class="fa-regular fa-clock"></i> ${escapeHtml(item.activity)}</strong>
                </div>
            </div>
            <div class="request-card-actions">
                ${item.progress ? `
                    <div class="request-progress">
                        ${["In Progress", "On the way", "Working", "Review", "Done"].map((step, index) => `<span class="${index === 0 ? "active" : ""}"><i></i>${step}</span>`).join("")}
                    </div>
                ` : ""}
                ${item.rated ? `<div class="request-rated"><span>★★★★★</span><small>You rated on May 16</small></div>` : ""}
                <div class="request-actions-row">${item.actions.map(requestActionButton).join("")}<button class="request-more" type="button" data-view-link="detail"><i class="fa-solid fa-ellipsis"></i></button></div>
            </div>
            <button class="request-card-open" type="button" data-view-link="detail" aria-label="Open request"><i class="fa-solid fa-chevron-right"></i></button>
        </article>`;
}

const screens = {
    home() {
        const homeRequests = clientHomeFallbackRequests();
        return `
            <div class="mock-home-hero-row">
                <div class="mock-page-hero">
                    <h1>Good morning, Alex! <span aria-hidden="true">👋</span></h1>
                    <p>${escapeHtml(subtitles.home)}</p>
                </div>
                <button class="kaila-location-chip mock-home-location" type="button"><i class="fa-solid fa-location-dot"></i> Makati City <i class="fa-solid fa-chevron-down"></i></button>
            </div>
            ${clientStatRow()}
            <div class="mock-home-section">${clientQuickActions(5)}</div>
            <div class="mock-home-section">${mockSearchBar()}</div>
            <div class="mock-home-section">${mockCategoryPills()}</div>
            <div class="mock-home-section kaila-card">
                ${sectionHead("Your Recent Requests", `<button class="mock-link-btn" type="button" data-view-link="requests">View all <i class="fa-solid fa-chevron-right"></i></button>`)}
                ${homeRequests.map((item) => mockHomeRequestRow(item, item.offers?.length ? "offers" : "detail")).join("")}
            </div>
            <div class="mock-home-mobile-safety">${sidebarTrustCard()}</div>
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
    bookings() {
        return `
            ${mockPageHero("Bookings", subtitles.bookings)}
            <div class="row g-3">
                ${[
                    ["Upcoming service", "Fix leaking faucet", "May 26, 2025 · Afternoon", "blue"],
                    ["Pending confirmation", "Home deep cleaning", "Waiting for provider", "orange"],
                    ["Completed", "Install additional outlet", "Rated 5.0", "green"],
                ].map(([label, title, meta, tone]) => card(`
                    ${pill(label, tone)}
                    <h3 class="h6 mt-3 mb-1">${escapeHtml(title)}</h3>
                    <p class="text-muted mb-0">${escapeHtml(meta)}</p>
                `, "col-md-4")).join("")}
            </div>`;
    },
    favorites() {
        return `
            ${mockPageHero("Favorites", subtitles.favorites)}
            ${card(`<p class="mock-empty">Saved services, posts, and providers will appear here.</p>`)}
        `;
    },
    payments() {
        return `
            ${mockPageHero("Payments", subtitles.payments)}
            <div class="row g-3">
                <div class="col-md-6">${card(`<h3 class="h6">Payment methods</h3><p class="text-muted mb-0">Add cards, wallets, and preferred payment options.</p>`)}</div>
                <div class="col-md-6">${card(`<h3 class="h6">Receipts & credits</h3><p class="text-muted mb-0">Review receipts and KAILA credits from completed jobs.</p>`)}</div>
            </div>`;
    },
    reviews() {
        return `
            ${mockPageHero("Reviews", subtitles.reviews)}
            ${card(`<p class="mock-empty">Your ratings and provider reviews will appear after completed jobs.</p>`)}
        `;
    },
    "saved-providers"() {
        return `
            ${mockPageHero("Saved Providers", subtitles["saved-providers"])}
            ${card(`<p class="mock-empty">Save providers after comparing offers or completing jobs.</p>`)}
        `;
    },
    post() {
        return `
            ${mockPageHero("Post a Service Request", subtitles.post)}
            ${mockPostRequestForm(categories(), urgencies(), area())}
        `;
    },
    requests() {
        const items = demoClientRequestsList();
        return `
            <section class="client-requests-page">
                <div class="requests-mobile-top">
                    <div>
                        <img src="/assets/brand/kaila-logo.png" alt="KAILA">
                        <h1>My Requests</h1>
                        <p>Manage all your service requests</p>
                    </div>
                    <div class="requests-mobile-actions">
                        <button type="button" data-view-link="notifications"><i class="fa-regular fa-bell"></i><b>3</b></button>
                        ${avatar("Juan Dela Cruz", "", "")}
                    </div>
                </div>
                <div class="requests-page-head">
                    <div>
                        <h1>My Requests</h1>
                        <p>Manage all your service requests in one place.</p>
                    </div>
                    <button class="btn btn-primary" type="button" data-view-link="post"><i class="fa-solid fa-plus"></i> Post Request</button>
                </div>
                <div class="requests-toolbar">
                    <div class="requests-filter-tabs">
                        ${[
                            ["All", "18", "fa-table-cells", "active"],
                            ["Open", "5", "fa-clipboard", ""],
                            ["Active", "6", "fa-briefcase", ""],
                            ["Completed", "5", "fa-circle-check", ""],
                            ["Disputed", "2", "fa-circle-exclamation", ""],
                        ].map(([label, count, fa, active]) => `<button class="${active}" type="button"><i class="fa-solid ${fa}"></i>${label}<b>${count}</b></button>`).join("")}
                    </div>
                    <div class="requests-sort">
                        <span>Sort by:</span>
                        <button type="button"><i class="fa-solid fa-filter"></i> Last activity <i class="fa-solid fa-chevron-down"></i></button>
                        <button type="button" aria-label="Filter"><i class="fa-solid fa-sliders"></i></button>
                    </div>
                </div>
                <div class="requests-list">
                    ${items.map(requestListCard).join("")}
                </div>
                <footer class="requests-pagination">
                    <span>Showing 1 to 6 of 18 requests</span>
                    <div><button class="active">1</button><button>2</button><button>3</button><button><i class="fa-solid fa-chevron-right"></i></button><button><i class="fa-solid fa-angles-right"></i></button></div>
                </footer>
            </section>
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
            </section>`;
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
            <div class="kaila-route-panel">
                <div class="kaila-route-summary">
                    <div>
                        <h3 class="mb-1">Live provider route</h3>
                        <p class="text-muted mb-0">${nav?.distance_meters ? `${Math.round(nav.distance_meters / 100) / 10} km away` : "Waiting for provider travel update"} · ETA ${nav?.eta_minutes || "—"} min</p>
                    </div>
                    <button class="btn btn-outline-primary" type="button" data-view-link="detail"><i class="fa-solid fa-circle-info"></i> Job details</button>
                </div>
                <div class="kaila-route-map" data-client-route-map></div>
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
                <p class="text-muted">Active jobs are marked disputed for support review. A moderation report is also filed.</p>
                <div class="mb-3"><label class="form-label">Reason</label><input class="form-control" name="reason" required></div>
                <div class="mb-3"><label class="form-label">Details</label><textarea class="form-control" name="details"></textarea></div>
                <button class="btn btn-danger w-100" type="submit">Send to support</button>
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
            <section class="client-settings-page">
                <div class="settings-mobile-title">
                    <button type="button" data-view-link="home" aria-label="Back"><i class="fa-solid fa-arrow-left"></i></button>
                    <h1>Profile & Settings</h1>
                </div>
                <div class="settings-page-head">
                    <h1>Profile & Settings</h1>
                    <p>Manage your account, preferences, and privacy.</p>
                </div>

                <section class="settings-profile-card">
                    <div class="settings-profile-card__avatar">
                        <img src="/assets/registration/client-registration-illustration.png" alt="">
                    </div>
                    <div class="settings-profile-card__body">
                        <h2>Juan Dela Cruz <span>Client</span></h2>
                        <p>juandelacruz@gmail.com</p>
                        <small>Member since May 24, 2025</small>
                    </div>
                    <button class="btn btn-outline-primary" type="button" data-toast="Edit profile is coming soon."><i class="fa-solid fa-pen"></i> Edit Profile</button>
                    <i class="fa-solid fa-chevron-right settings-profile-card__mobile-chev"></i>
                </section>

                <div class="settings-grid">
                    <div class="settings-column">
                        ${settingsSection("Account & Contact", [
                            settingsRow({ iconName: "fa-phone", tone: "blue", label: "Contact number", value: "+63 912 345 6789" }),
                            settingsRow({ iconName: "fa-message", tone: "purple", label: "Messenger link", value: "m.me/juandelacruz" }),
                            settingsRow({ iconName: "fa-phone-volume", tone: "green", label: "Preferred contact channel", value: "Messenger" }),
                            settingsRow({ iconName: "fa-clock", tone: "violet", label: "Best contact time", value: "9:00 AM - 6:00 PM" }),
                            settingsRow({ iconName: "fa-location-dot", tone: "red", label: "Address / Area", value: "Quezon City, Metro Manila" }),
                        ])}

                        ${settingsSection("Legal", [
                            settingsRow({ iconName: "fa-shield-halved", tone: "blue", label: "Privacy Policy", view: "support" }),
                            settingsRow({ iconName: "fa-file-lines", tone: "green", label: "Terms of Service", view: "support" }),
                            settingsRow({ iconName: "fa-headset", tone: "purple", label: "Contact Support", view: "support" }),
                        ])}
                    </div>

                    <div class="settings-column">
                        ${settingsSection("Preferences", [
                            settingsRow({ iconName: "fa-palette", tone: "purple", label: "Theme", value: "System" }),
                            settingsToggleRow({ iconName: "fa-bell", tone: "blue", label: "Push notifications" }),
                            settingsToggleRow({ iconName: "fa-envelope", tone: "green", label: "Email notifications" }),
                        ])}

                        ${settingsSection("Safety & Privacy", [
                            settingsRow({ iconName: "fa-user-group", tone: "orange", label: "Blocked users", sub: "Manage users you've blocked.", badge: "2" }),
                        ])}

                        <section class="settings-section-card settings-danger-card">
                            <h2>Danger Zone</h2>
                            ${settingsRow({ iconName: "fa-trash-can", tone: "red", label: "Request account deletion", sub: "Permanently delete your account and all data.", view: "delete", danger: true })}
                        </section>
                    </div>
                </div>

                <div class="settings-security-banner">
                    <span><i class="fa-solid fa-shield-halved"></i></span>
                    <div>
                        <strong>Your privacy and security are important to us.</strong>
                        <p>We use industry-standard measures to protect your data and keep your account safe.</p>
                    </div>
                </div>
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
        sidebarPostButton: true,
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

    const locationMap = document.querySelector("[data-location-map]");
    if (locationMap) {
        let locationPicker = null;
        initLocationPicker({
            mapEl: locationMap,
            inputEl: document.querySelector("[data-location-search]"),
            latInput: document.querySelector("[data-job-lat]"),
            lngInput: document.querySelector("[data-job-lng]"),
            areaInput: document.querySelector("[data-location-area]"),
        }).then((picker) => {
            locationPicker = picker;
        }).catch((error) => showToast(error.message));

        document.querySelector("[data-focus-location]")?.addEventListener("click", () => {
            document.querySelector("[data-location-search]")?.focus();
        });

        document.querySelector("[data-use-current-location]")?.addEventListener("click", () => {
            if (!navigator.geolocation) return showToast("Geolocation is not supported on this device.");
            navigator.geolocation.getCurrentPosition((position) => {
                const latInput = document.querySelector("[data-job-lat]");
                const lngInput = document.querySelector("[data-job-lng]");
                const positionValue = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                if (latInput) latInput.value = position.coords.latitude.toFixed(7);
                if (lngInput) lngInput.value = position.coords.longitude.toFixed(7);
                if (locationPicker) {
                    locationPicker.marker.setLatLng(positionValue);
                    locationPicker.map.panTo(positionValue);
                }
                showToast("Current location captured.");
            }, () => showToast("Could not get your current location."));
        });
    }

    const clientRouteMap = document.querySelector("[data-client-route-map]");
    if (clientRouteMap) {
        const job = currentJob();
        const nav = job?.navigation_state;
        renderRouteMap(clientRouteMap, {
            destination: { lat: job?.job_lat, lng: job?.job_lng },
            provider: { lat: nav?.provider_lat, lng: nav?.provider_lng },
            label: "Provider route",
        }).catch((error) => showToast(error.message));
    }

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
        const note = [data.reason, data.details].filter(Boolean).join(": ");
        try {
            if (["Accepted", "In Progress", "Provider Marked Done", "Payment Released"].includes(job.status)) {
                await jobAction(job.id, "dispute", { dispute_note: note || "Dispute opened by client." });
            }
            await reportJob(job.id, data.reason, data.details);
            showToast("Dispute and report sent to support.");
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
    if (document.querySelector("[data-client-chat]") && job && loadedClientJobMessagesFor !== job.id) {
        loadedClientJobMessagesFor = job.id;
        loadJobMessages(job.id).catch(() => {});
    }
    if (document.querySelector("[data-client-support]") && store.supportDesk && loadedClientSupportFor !== store.supportDesk.id) {
        loadedClientSupportFor = store.supportDesk.id;
        loadDirectMessages(store.supportDesk.id).catch(() => {});
    }
    if (document.querySelector("[data-feed-compose]") && !loadedClientFeed) {
        loadedClientFeed = true;
        loadFeed().catch(() => {});
    }
    if (document.querySelector("[data-refresh-analytics]")) {
        import("./kaila-api.js").then(({ loadAnalytics }) => loadAnalytics().catch(() => {}));
    }
}
