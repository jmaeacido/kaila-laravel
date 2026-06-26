import { escapeHtml, firstName, greeting, icon, pill } from "./kaila-ui-core.js";
import { formatBudget, offerCount, requestTitle, statusTone, store, timeAgo } from "./kaila-api.js";

export function categoryFaIcon(category = "") {
    return ({
        Plumbing: "fa-faucet-drip",
        Electrical: "fa-bolt",
        "Cleaning Services": "fa-broom",
        Cleaning: "fa-bucket",
        Repair: "fa-screwdriver-wrench",
        Painting: "fa-paint-roller",
        Carpentry: "fa-hammer",
        "Aircon & Refrigeration": "fa-fan",
        "Appliance Repair": "fa-plug",
        "Computer & IT Services": "fa-laptop",
        "Beauty Services": "fa-spa",
        Tutoring: "fa-book",
        "General Handyman": "fa-toolbox",
    })[category] || "fa-wrench";
}

export function categoryTone(category = "") {
    const normalized = String(category).toLowerCase();
    if (normalized.includes("plumb") || normalized.includes("faucet")) return "plumbing";
    if (normalized.includes("electrical") || normalized.includes("outlet")) return "electrical";
    if (normalized.includes("clean")) return "cleaning";
    if (normalized.includes("repair") || normalized.includes("toilet")) return "repair";
    if (normalized.includes("paint")) return "painting";
    if (normalized.includes("aircon") || normalized.includes("appliance")) return "aircon";
    if (normalized.includes("errand")) return "errands";
    if (normalized.includes("home")) return "home-help";
    return "default";
}

export function categoryThumb(category = "") {
    const fa = categoryFaIcon(category);
    return `<span class="mock-thumb service-icon service-icon--${categoryTone(category)}"><i class="fa-solid ${fa}"></i></span>`;
}

export function mockSearchBar(placeholder = "Search your requests or services...") {
    return `
        <div class="mock-search mock-search--wide">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="search" placeholder="${escapeHtml(placeholder)}" aria-label="Search">
            <button class="mock-search__filter" type="button"><i class="fa-solid fa-sliders"></i> Filter</button>
        </div>`;
}

export function mockFilterTabs(tabs = [], active = "all") {
    return `<div class="mock-filter-tabs">${tabs.map(([id, label]) => `
        <button class="mock-filter-tab ${id === active ? "active" : ""}" type="button" data-filter-tab="${id}">${escapeHtml(label)}</button>
    `).join("")}</div>`;
}

export function mockCategoryPills(categories = [], active = "All") {
    const preferred = ["Plumbing", "Electrical", "Cleaning", "Repair", "Painting"];
    const items = ["All", ...preferred, "More"];
    return `<div class="mock-category-row">${items.map((item) => `
        <button class="mock-category-pill ${item === active ? "active" : ""}" type="button" data-category-pill="${escapeHtml(item)}">
            ${item !== "All" && item !== "More" ? `<i class="fa-solid ${categoryFaIcon(item)} service-icon service-icon--${categoryTone(item)}"></i>` : item === "More" ? `<i class="fa-solid fa-ellipsis service-icon service-icon--default"></i>` : `<i class="fa-solid fa-table-cells service-icon service-icon--all"></i>`}
            <span>${escapeHtml(item)}</span>
        </button>`).join("")}</div>`;
}

export function mockStatCard(fa, value, label, trend, tone = "blue") {
    return `
        <div class="mock-stat-card mock-stat-card--${tone}">
            <div class="mock-stat-card__icon mock-stat-card__icon--${tone}"><i class="fa-solid ${fa}"></i></div>
            <div class="mock-stat-card__value">${escapeHtml(String(value))}</div>
            <div class="mock-stat-card__label">${escapeHtml(label)}</div>
            ${trend ? `<div class="mock-stat-card__trend">${escapeHtml(trend)}</div>` : ""}
        </div>`;
}

export function clientStatRow(stats) {
    const dashboardStats = {
        postedRequests: 12,
        activeJobs: 3,
        offersReceived: 18,
        completedJobs: 9,
        averageRating: "4.8",
    };
    return `<div class="mock-stat-grid">
        ${mockStatCard("fa-file-lines", dashboardStats.postedRequests, "Posted Requests", "↗ 2 from last week", "blue")}
        ${mockStatCard("fa-briefcase", dashboardStats.activeJobs, "Active Jobs", "→ Same as last week", "orange")}
        ${mockStatCard("fa-user-group", dashboardStats.offersReceived, "Offers Received", "↗ 4 from last week", "cyan")}
        ${mockStatCard("fa-check", dashboardStats.completedJobs, "Completed Jobs", "↗ 3 from last week", "green")}
        ${mockStatCard("fa-star", dashboardStats.averageRating || "4.8", "Avg. Rating", "↗ 0.2 from last week", "purple")}
    </div>`;
}

export function clientQuickActions(unreadMessages = 0) {
    return `<div class="mock-quick-grid">
        <button class="mock-quick-card mock-quick-card--primary" type="button" data-view-link="post">
            <span class="mock-quick-card__icon"><i class="fa-solid fa-plus"></i></span>
            <span class="mock-quick-card__title">Post Request</span>
            <span class="mock-quick-card__sub">Get offers</span>
        </button>
        <button class="mock-quick-card" type="button" data-view-link="offers">
            <span class="mock-quick-card__icon"><i class="fa-solid fa-tags"></i></span>
            <span class="mock-quick-card__title">View Offers</span>
            <span class="mock-quick-card__sub">Compare offers</span>
        </button>
        <button class="mock-quick-card" type="button" data-view-link="inbox">
            <span class="mock-quick-card__icon"><i class="fa-solid fa-comment-dots"></i>${unreadMessages ? `<b>${unreadMessages}</b>` : ""}</span>
            <span class="mock-quick-card__title">Messages</span>
            <span class="mock-quick-card__sub">Chat with pros</span>
        </button>
        <button class="mock-quick-card" type="button" data-view-link="support">
            <span class="mock-quick-card__icon"><i class="fa-solid fa-headset"></i></span>
            <span class="mock-quick-card__title">Support</span>
            <span class="mock-quick-card__sub">Help & FAQ</span>
        </button>
    </div>`;
}

export function mockRequestListCard(item, linkView = "detail") {
    const tone = statusTone(item.status);
    const label = item.status === "Offers Received" ? `${offerCount(item)} OFFERS` : item.status.toUpperCase();
    const offers = item.offers?.length || 0;
    return `
        <article class="mock-request-card">
            <div class="mock-request-card__media">
                ${categoryThumb(item.category)}
                <span class="mock-request-card__media-count"><i class="fa-regular fa-image"></i> ${Math.min(offers || 1, 3)}</span>
            </div>
            <div class="mock-request-card__body">
                <div class="mock-request-card__top">
                    ${pill(label, tone)}
                    <span class="mock-request-card__activity">Last activity · ${timeAgo(item.updated_at || item.created_at)}</span>
                </div>
                <h3>${escapeHtml(requestTitle(item))}</h3>
                <p>${escapeHtml(String(item.details || "").slice(0, 120))}</p>
                <div class="mock-request-card__meta">
                    <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.area)}</span>
                    <span><i class="fa-regular fa-calendar"></i> ${escapeHtml(item.preferred_schedule || "Flexible")}</span>
                    <span><i class="fa-regular fa-clock"></i> ${timeAgo(item.created_at)}</span>
                </div>
                <div class="mock-request-card__footer">
                    <div>
                        <small>Budget</small>
                        <strong>${formatBudget(item)}</strong>
                        ${offers ? `<div class="mock-offer-avatars">${Array.from({ length: Math.min(offers, 3) }).map((_, i) => `<span>P${i + 1}</span>`).join("")}<em>${offers} offers</em></div>` : ""}
                    </div>
                    <div class="mock-request-card__actions">
                        ${item.status === "Offers Received" ? `<button class="btn btn-outline-primary btn-sm" type="button" data-select-request="${item.id}" data-view-link="offers">View Offers</button>` : ""}
                        ${["Accepted", "In Progress", "Provider Marked Done"].includes(item.status) ? `<button class="btn btn-outline-primary btn-sm" type="button" data-select-request="${item.id}" data-view-link="chat">Chat with Provider</button>` : ""}
                        <button class="btn btn-outline-secondary btn-sm" type="button" data-select-request="${item.id}" data-view-link="${linkView}">View Details</button>
                    </div>
                </div>
            </div>
            <button class="mock-request-card__chevron" type="button" data-select-request="${item.id}" data-view-link="${linkView}" aria-label="Open request">
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        </article>`;
}

export function mockHomeRequestRow(item, linkView = "detail") {
    const completed = ["Rated / Closed", "Closed", "Payment Released"].includes(item.status);
    const active = ["Accepted", "In Progress"].includes(item.status);
    const tone = completed ? "green" : active ? "orange" : statusTone(item.status);
    const label = item.status === "Offers Received" ? `${offerCount(item)} OFFERS` : completed ? "COMPLETED" : active ? "ACTIVE" : item.status.toUpperCase();
    return `
        <button class="mock-recent-row" type="button" data-select-request="${item.id}" data-view-link="${linkView}">
            <span class="mock-recent-row__thumb">${categoryThumb(item.category)}</span>
            <span class="mock-recent-row__body">
                <strong>${escapeHtml(requestTitle(item))}</strong>
                <small>${escapeHtml(item.area)} · Posted ${timeAgo(item.created_at)}</small>
                ${pill(label, tone)}
            </span>
            <span class="mock-recent-row__meta">
                <em class="${completed ? "is-rating" : ""}">${completed ? "5.0 ★" : formatBudget(item)}</em>
                <small>${completed ? "Rated" : "Budget"}</small>
            </span>
            <i class="fa-solid fa-chevron-right mock-recent-row__chev"></i>
        </button>`;
}

export function clientHomeFallbackRequests() {
    const now = Date.now();
    return [
        {
            id: -101,
            category: "Plumbing",
            area: "Makati City",
            status: "Offers Received",
            details: "Fix leaking faucet",
            budget: "1,200",
            offers: [{ id: 1 }, { id: 2 }, { id: 3 }],
            created_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: -102,
            category: "Electrical",
            area: "Makati City",
            status: "Accepted",
            details: "Install additional outlet",
            budget: "1,500",
            offers: [],
            created_at: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: -103,
            category: "Cleaning",
            area: "Makati City",
            status: "Rated / Closed",
            details: "Home deep cleaning",
            budget: "2,000",
            offers: [],
            created_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
    ];
}

export function sidebarQuickLinks(role = "client") {
    const links = role === "provider"
        ? [
            ["settings", "fa-user-gear", "Edit Profile"],
            ["support", "fa-headset", "Contact Support"],
            ["feed", "fa-users", "Community Feed"],
        ]
        : [
            ["register", "fa-shield-halved", "Become a Pro"],
            ["support", "fa-circle-question", "Help Center"],
            ["feed", "fa-gift", "Invite & Earn"],
        ];
    return `
        <div class="mock-sidebar-section">
            <p class="mock-sidebar-section__label">Quick links</p>
            ${links.map(([view, fa, label]) => `
                <button class="mock-sidebar-link" type="button" data-view-link="${view}">
                    <i class="fa-solid ${fa}"></i><span>${label}</span><i class="fa-solid fa-chevron-right"></i>
                </button>`).join("")}
        </div>`;
}

export function sidebarTrustCard() {
    return `
        <div class="mock-trust-card">
            <i class="fa-solid fa-shield-check"></i>
            <div>
                <strong>You're in safe hands</strong>
                <p>All providers are verified. Payments are secure.</p>
                <button type="button" data-view-link="support">Learn more →</button>
            </div>
        </div>`;
}

export function sidebarPromoCards() {
    return `
        <div class="mock-promo-card">
            <i class="fa-solid fa-gift"></i>
            <div>
                <strong>Invite & earn</strong>
                <p>Invite a friend and get ₱100 credit when they complete a job.</p>
                <button class="btn btn-outline-primary btn-sm" type="button" data-view-link="feed">Invite Now</button>
            </div>
        </div>
        <div class="mock-promo-card">
            <i class="fa-solid fa-headset"></i>
            <div>
                <strong>Need help?</strong>
                <p>Our support team is here for you.</p>
                <button class="btn btn-outline-primary btn-sm" type="button" data-view-link="support">Contact Support</button>
            </div>
        </div>`;
}

export function mockPageHero(title, subtitle, userName = "") {
    return `
        <div class="mock-page-hero">
            ${userName ? `<h1>${escapeHtml(greeting())}, ${escapeHtml(firstName(userName))}! <span aria-hidden="true">👋</span></h1>` : `<h1>${escapeHtml(title)}</h1>`}
            <p>${escapeHtml(subtitle)}</p>
        </div>`;
}

export function providerStatRow(stats) {
    return `<div class="mock-stat-grid mock-stat-grid--6">
        ${mockStatCard("fa-users", stats.matchingRequests, "Matching Requests", "New", "blue")}
        ${mockStatCard("fa-paper-plane", stats.offersSent, "Offers Sent", "This month", "blue")}
        ${mockStatCard("fa-circle-check", stats.acceptedJobs, "Accepted Jobs", "This month", "green")}
        ${mockStatCard("fa-briefcase", stats.activeJobs, "Active Jobs", "Ongoing", "orange")}
        ${mockStatCard("fa-clipboard-check", stats.completedJobs, "Completed Jobs", "All time", "green")}
        ${mockStatCard("fa-star", stats.averageRating || "4.8", "Average Rating", "⭐ Reviews", "purple")}
    </div>`;
}

export function providerQuickActions() {
    const items = [
        ["requests", "fa-magnifying-glass", "View Matching Requests", "See jobs that match your skills and location."],
        ["settings", "fa-user-gear", "Edit Provider Profile", "Update your services, photos, and information."],
        ["inbox", "fa-comment-dots", "Messages", "Check your messages and client conversations."],
        ["support", "fa-headset", "Support", "Get help and answer your questions."],
    ];
    return `<div class="mock-quick-grid">${items.map(([view, fa, title, sub]) => `
        <button class="mock-provider-action" type="button" data-view-link="${view}">
            <i class="fa-solid ${fa}"></i>
            <strong>${title}</strong>
            <span>${sub}</span>
        </button>`).join("")}</div>`;
}

export function providerMatchingCard(item) {
    const priority = item.urgency === "Now" ? "High" : item.urgency === "Today" ? "Medium" : "Low";
    const priorityTone = priority === "High" ? "red" : priority === "Medium" ? "orange" : "blue";
    return `
        <div class="mock-match-card">
            <div class="mock-match-card__head">
                <strong>${escapeHtml(requestTitle(item))}</strong>
                ${pill(priority, priorityTone)}
            </div>
            <p>${escapeHtml(item.category)} · ${escapeHtml(item.area)}</p>
            <div class="mock-match-card__foot">
                <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.area)}</span>
                <span>${timeAgo(item.created_at)}</span>
                <div class="mock-match-card__actions">
                    <button class="btn btn-outline-secondary btn-sm" type="button" data-select-request="${item.id}" data-view-link="detail">View</button>
                    <button class="btn btn-outline-secondary btn-sm" type="button" data-pass-request="${item.id}">Pass</button>
                    <button class="btn btn-primary btn-sm" type="button" data-select-request="${item.id}" data-view-link="send-offer">Send Offer</button>
                </div>
            </div>
        </div>`;
}

export function mockInboxShell({ threads = [], messages = [], activeTitle = "Conversation", activeSub = "", safety = true, composeAttr = "data-client-chat" }) {
    return `
        <div class="mock-inbox-layout">
            <aside class="mock-inbox-list">
                <div class="mock-inbox-list__head">
                    <div>
                        <h2>Inbox</h2>
                        <p>All your conversations in one place.</p>
                    </div>
                </div>
                ${mockFilterTabs([
                    ["all", `All Messages (${threads.length})`],
                    ["jobs", `Job Messages (${threads.length})`],
                    ["support", "Support (1)"],
                ])}
                <div class="mock-inbox-section">
                    <div class="mock-inbox-section__head"><strong>Job Conversations</strong><button type="button" data-view-link="inbox">View all</button></div>
                    ${threads.map((item, index) => `
                        <button class="mock-thread ${index === 0 ? "active" : ""}" type="button" data-select-request="${item.id}" data-view-link="chat">
                            ${icon("fa-user")}
                            <span>
                                <strong>${escapeHtml(providerForName(item))}</strong>
                                <em>${escapeHtml(requestTitle(item))}</em>
                                <small>${escapeHtml(String(item.details || "").slice(0, 48))}</small>
                            </span>
                            <b>${timeAgo(item.updated_at || item.created_at)}</b>
                        </button>`).join("") || `<p class="mock-empty">No conversations yet.</p>`}
                </div>
            </aside>
            <section class="mock-chat-panel">
                <header class="mock-chat-panel__head">
                    <div>
                        <strong>${escapeHtml(activeTitle)}</strong>
                        <span>${escapeHtml(activeSub)}</span>
                    </div>
                    <div class="mock-chat-panel__actions">
                        <button type="button" data-view-link="call"><i class="fa-solid fa-phone"></i></button>
                        <button type="button" data-view-link="call"><i class="fa-solid fa-video"></i></button>
                        <button type="button" data-view-link="detail"><i class="fa-solid fa-circle-info"></i></button>
                    </div>
                </header>
                ${safety ? `<div class="mock-safety-banner"><i class="fa-solid fa-shield"></i> For your safety, keep conversations within KAILA. Never share personal contact details.</div>` : ""}
                <div class="mock-chat-panel__messages">
                    ${messages.map((message) => `
                        <div class="mock-chat-bubble ${message.sender_id === store.user?.id ? "out" : "in"}">
                            ${escapeHtml(message.body)}
                        </div>`).join("") || `<p class="mock-empty">Select a conversation to start chatting.</p>`}
                </div>
                <form class="mock-chat-compose" ${composeAttr}>
                    <button type="button" aria-label="Attach"><i class="fa-solid fa-paperclip"></i></button>
                    <input class="form-control" name="body" placeholder="Type a message...">
                    <button type="button" aria-label="Emoji"><i class="fa-regular fa-face-smile"></i></button>
                    <button class="mock-send-btn" type="submit" aria-label="Send"><i class="fa-solid fa-paper-plane"></i></button>
                </form>
            </section>
        </div>`;
}

function providerForName(item) {
    return item?.accepted_provider?.name || item?.offers?.[0]?.provider?.name || "Provider";
}

export function mockPostRequestForm(categories, urgencies, areaValue) {
    const services = [
        ["Plumbing", "fa-faucet-drip"],
        ["Electrical", "fa-bolt"],
        ["Cleaning", "fa-bucket"],
        ["Repair", "fa-screwdriver-wrench"],
        ["Errands", "fa-bag-shopping"],
        ["Home Help", "fa-house-chimney"],
        ["More", "fa-ellipsis"],
    ];
    return `
        <div class="post-request-page">
            <form data-client-post class="post-request-form">
                <input type="hidden" name="urgency" value="Today">
                <div class="post-mobile-head">
                    <div>
                        <h1>Post Service Request</h1>
                        <p>Tell us what you need, we'll match you with the right pros.</p>
                    </div>
                    <button type="button" data-view-link="home" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="post-page-head">
                    <h1>Post a Service Request</h1>
                    <p>Tell us what you need and we'll match you with the right providers.</p>
                </div>

                <section class="post-step">
                    <h2><span>1</span> What service do you need?</h2>
                    <div class="post-service-row">
                        ${services.map(([label, fa], index) => `
                            <label class="post-service-card post-service-card--${categoryTone(label)} ${index === 0 ? "is-selected" : ""}">
                                <input type="radio" name="category" value="${escapeHtml(label)}" ${index === 0 ? "checked" : ""}>
                                <i class="fa-solid ${fa}"></i>
                                <strong>${escapeHtml(label)}</strong>
                            </label>
                        `).join("")}
                    </div>
                </section>

                <section class="post-step">
                    <h2><span>2</span> Describe your request</h2>
                    <label class="post-field">
                        <span>Request title</span>
                        <input name="details_title" value="Fix leaking faucet in kitchen" maxlength="80">
                        <em>28/80</em>
                    </label>
                    <label class="post-field">
                        <span>Details <small>(the more details, the better offers you'll get)</small></span>
                        <textarea name="details" rows="4" required minlength="10">My kitchen faucet keeps leaking even when it's closed.
Please bring tools and replacement parts if needed.</textarea>
                        <em>118/1000</em>
                    </label>
                    <div class="post-field-grid post-field-grid--budget">
                        <label class="post-field">
                            <span>Budget</span>
                            <select name="budget_type"><option selected>Set a budget</option><option>Open budget</option><option>Get provider quote</option></select>
                        </label>
                        <label class="post-field">
                            <span>Budget amount</span>
                            <input name="budget" value="1,200">
                        </label>
                        <label class="post-check inline"><input type="checkbox" name="open_to_offers" value="1"> <span>Open to offers</span> <i class="fa-regular fa-circle-question"></i></label>
                    </div>
                </section>

                <section class="post-step">
                    <h2><span>3</span> When do you need this done?</h2>
                    <div class="post-field-grid">
                        <label class="post-field">
                            <span>Preferred date</span>
                            <input name="preferred_date" value="May 26, 2025">
                            <i class="fa-regular fa-calendar"></i>
                        </label>
                        <label class="post-field">
                            <span>Preferred time</span>
                            <input name="preferred_schedule" value="Afternoon (1 PM - 5 PM)">
                            <i class="fa-regular fa-clock"></i>
                        </label>
                    </div>
                </section>

                <section class="post-step">
                    <h2><span>4</span> Where is the service needed?</h2>
                    <label class="post-field">
                        <span>Service area</span>
                        <input name="area" value="Makati City, Metro Manila" required data-location-area>
                        <i class="fa-solid fa-location-dot"></i>
                    </label>
                    <input type="hidden" name="job_lat" value="14.5547000" data-job-lat>
                    <input type="hidden" name="job_lng" value="121.0244000" data-job-lng>
                    <button class="post-location-row" type="button" data-focus-location>
                        <span><small>Exact job location</small><input name="exact_location_notes" value="123 Arnaiz Ave., San Lorenzo, Makati City" data-location-search></span>
                        <i class="fa-solid fa-chevron-right"></i>
                    </button>
                    <div class="post-map-preview post-map-preview--interactive" data-location-map>
                        <div class="kaila-map-fallback"><i class="fa-solid fa-location-dot"></i><span>Loading map...</span></div>
                        <button type="button" data-use-current-location>Use current location <i class="fa-solid fa-crosshairs"></i></button>
                    </div>
                </section>

                <section class="post-step">
                    <h2><span>5</span> Media <small>(optional)</small> <em>Up to 3 files</em></h2>
                    <div class="post-media-row">
                        <div class="post-media-thumb"><i class="fa-solid fa-faucet-drip"></i><button type="button"><i class="fa-solid fa-xmark"></i></button><span>IMG_001.jpg<br>JPG · 2.4 MB</span></div>
                        <div class="post-media-thumb"><i class="fa-solid fa-sink"></i><button type="button"><i class="fa-solid fa-xmark"></i></button><span>IMG_002.png<br>PNG · 1.8 MB</span></div>
                        <div class="post-media-thumb"><i class="fa-solid fa-play"></i><button type="button"><i class="fa-solid fa-xmark"></i></button><span>Video_001.mp4<br>MP4 · 4.7 MB</span></div>
                        <label class="post-media-add">
                            <input type="file" name="attachments" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple data-media-input data-max="3">
                            <i class="fa-solid fa-plus"></i>
                            <span>Add photo<br>or video</span>
                        </label>
                    </div>
                    <p class="post-media-note">JPG, PNG, WebP, MP4, WebM · Max 3 files · Up to 50MB each</p>
                </section>

                <div class="post-consents">
                    <label class="post-check"><input type="checkbox" name="permission_to_forward" checked> <span>Allow KAILA to forward my request to matching service providers.<small>This helps you receive more offers faster.</small></span> <i class="fa-regular fa-circle-question"></i></label>
                    <label class="post-check"><input type="checkbox" name="consent_to_rate" checked> <span>I agree to be rated by providers and to rate my experience.</span> <i class="fa-regular fa-circle-question"></i></label>
                </div>

                <div class="post-form-actions">
                    <button class="btn btn-outline-secondary" type="button" data-view-link="home">Cancel</button>
                    <button class="btn btn-primary" type="submit">Post Request <i class="fa-regular fa-paper-plane"></i></button>
                </div>
            </form>

            <aside class="post-request-preview">
                <section class="post-success-card">
                    <span><i class="fa-solid fa-check"></i></span>
                    <h2>Your request has been posted!</h2>
                    <p>We're notifying nearby providers and you'll start receiving offers soon.</p>
                </section>
                <section class="post-summary-card">
                    <span class="post-summary-image"><i class="fa-solid fa-faucet-drip"></i></span>
                    <div>
                        <strong>Fix leaking faucet in kitchen</strong>
                        <small><i class="fa-solid fa-location-dot"></i> Makati City, Metro Manila</small>
                        <small><i class="fa-regular fa-calendar"></i> May 26, 2025 · Afternoon (1 PM - 5 PM)</small>
                        <small>Budget: ₱1,200 · <b>Open to offers</b></small>
                    </div>
                </section>
                <div class="post-alert"><i class="fa-regular fa-bell"></i> You'll be notified when providers send you offers.</div>
                <section class="post-status-card">
                    <h3>Request Status</h3>
                    ${[
                        ["fa-check", "Request posted", "Just now", "done"],
                        ["fa-paper-plane", "Finding matching providers", "In progress", "active"],
                        ["fa-clock", "Offers incoming", "You'll be notified", ""],
                        ["fa-user", "Select & hire a provider", "You're in control", ""],
                    ].map(([fa, title, sub, state]) => `
                        <div class="post-status-step ${state}">
                            <span><i class="fa-solid ${fa}"></i></span>
                            <div><strong>${title}</strong><small>${sub}</small></div>
                        </div>
                    `).join("")}
                </section>
                <section class="post-tips-card">
                    <i class="fa-regular fa-lightbulb"></i>
                    <div>
                        <strong>Tips</strong>
                        <ul>
                            <li>Keep your phone notifications on for faster updates.</li>
                            <li>More details and photos = better offers.</li>
                            <li>You can edit or cancel your request anytime.</li>
                        </ul>
                    </div>
                </section>
                <button class="btn btn-primary" type="button" data-view-link="requests"><i class="fa-regular fa-clipboard"></i> View My Requests</button>
                <button class="btn btn-outline-primary" type="button" data-view-link="inbox"><i class="fa-regular fa-message"></i> Go to Messages</button>
            </aside>
        </div>`;
}
