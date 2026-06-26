import { escapeHtml, firstName, greeting, icon, pill } from "./kaila-ui-core.js";
import { formatBudget, offerCount, requestTitle, statusTone, store, timeAgo } from "./kaila-api.js";

export function categoryFaIcon(category = "") {
    return ({
        Plumbing: "fa-faucet-drip",
        Electrical: "fa-bolt",
        "Cleaning Services": "fa-broom",
        Repair: "fa-screwdriver-wrench",
        Carpentry: "fa-hammer",
        "Aircon & Refrigeration": "fa-fan",
        "Appliance Repair": "fa-plug",
        "Computer & IT Services": "fa-laptop",
        "Beauty Services": "fa-spa",
        Tutoring: "fa-book",
        "General Handyman": "fa-toolbox",
    })[category] || "fa-wrench";
}

export function categoryThumb(category = "") {
    const fa = categoryFaIcon(category);
    return `<span class="mock-thumb mock-thumb--${statusTone("Posted")}"><i class="fa-solid ${fa}"></i></span>`;
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
    const items = ["All", ...categories.slice(0, 5), "More"];
    return `<div class="mock-category-row">${items.map((item) => `
        <button class="mock-category-pill ${item === active ? "active" : ""}" type="button" data-category-pill="${escapeHtml(item)}">
            ${item !== "All" && item !== "More" ? `<i class="fa-solid ${categoryFaIcon(item)}"></i>` : item === "More" ? `<i class="fa-solid fa-ellipsis"></i>` : `<i class="fa-solid fa-table-cells"></i>`}
            <span>${escapeHtml(item)}</span>
        </button>`).join("")}</div>`;
}

export function mockStatCard(fa, value, label, trend, tone = "blue") {
    return `
        <div class="mock-stat-card">
            <div class="mock-stat-card__icon mock-stat-card__icon--${tone}"><i class="fa-solid ${fa}"></i></div>
            <div class="mock-stat-card__value">${escapeHtml(String(value))}</div>
            <div class="mock-stat-card__label">${escapeHtml(label)}</div>
            ${trend ? `<div class="mock-stat-card__trend">${escapeHtml(trend)}</div>` : ""}
        </div>`;
}

export function clientStatRow(stats) {
    return `<div class="mock-stat-grid">
        ${mockStatCard("fa-paper-plane", stats.postedRequests, "Posted Requests", "↗ 2 from last week", "blue")}
        ${mockStatCard("fa-briefcase", stats.activeJobs, "Active Jobs", "→ Same as last week", "orange")}
        ${mockStatCard("fa-user-plus", stats.offersReceived, "Offers Received", "↗ 4 from last week", "cyan")}
        ${mockStatCard("fa-circle-check", stats.completedJobs, "Completed Jobs", "↗ 3 from last week", "green")}
        ${mockStatCard("fa-star", stats.averageRating || "4.8", "Avg. Rating", "↘ 0.2 from last week", "purple")}
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
    const tone = statusTone(item.status);
    const label = item.status === "Offers Received" ? `${offerCount(item)} OFFERS` : item.status === "Rated / Closed" || item.status === "Closed" ? "COMPLETED" : item.status.toUpperCase();
    const endLabel = ["Rated / Closed", "Closed", "Payment Released"].includes(item.status)
        ? "5.0 ★ Rated"
        : `${formatBudget(item)} Budget`;
    return `
        <button class="mock-recent-row" type="button" data-select-request="${item.id}" data-view-link="${linkView}">
            <span class="mock-recent-row__thumb">${categoryThumb(item.category)}</span>
            <span class="mock-recent-row__body">
                <strong>${escapeHtml(requestTitle(item))}</strong>
                <small>${escapeHtml(item.area)} · Posted ${timeAgo(item.created_at)}</small>
            </span>
            <span class="mock-recent-row__meta">
                ${pill(label, tone)}
                <em>${endLabel}</em>
            </span>
            <i class="fa-solid fa-chevron-right mock-recent-row__chev"></i>
        </button>`;
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
    return `
        <div class="row g-4">
            <div class="col-xl-8">
                <form data-client-post class="mock-post-form">
                    <section class="mock-form-section">
                        <div class="mock-form-section__head"><span>1</span><div><h3>What service do you need?</h3></div></div>
                        <div class="mock-service-grid">
                            ${categories.slice(0, 6).map((item, index) => `
                                <label class="mock-service-chip ${index === 0 ? "active" : ""}">
                                    <input type="radio" name="category" value="${escapeHtml(item)}" ${index === 0 ? "checked" : ""}>
                                    <i class="fa-solid ${categoryFaIcon(item)}"></i>
                                    <span>${escapeHtml(item)}</span>
                                </label>`).join("")}
                        </div>
                    </section>
                    <section class="mock-form-section">
                        <div class="mock-form-section__head"><span>2</span><div><h3>Describe your request</h3></div></div>
                        <div class="row g-3">
                            <div class="col-md-6"><label class="form-label">Urgency</label><select class="form-select" name="urgency">${urgencies.map((item) => `<option>${escapeHtml(item)}</option>`).join("")}</select></div>
                            <div class="col-md-6"><label class="form-label">Budget</label><input class="form-control" name="budget" placeholder="₱1,200"></div>
                            <div class="col-12"><label class="form-label">Request details</label><textarea class="form-control" name="details" rows="4" required minlength="10" placeholder="Describe what you need done"></textarea></div>
                        </div>
                    </section>
                    <section class="mock-form-section">
                        <div class="mock-form-section__head"><span>3</span><div><h3>When and where?</h3></div></div>
                        <div class="row g-3">
                            <div class="col-md-6"><label class="form-label">Preferred schedule</label><input class="form-control" name="preferred_schedule" placeholder="Today after 4 PM"></div>
                            <div class="col-md-6"><label class="form-label">Service area</label><input class="form-control" name="area" value="${escapeHtml(areaValue)}" required></div>
                        </div>
                    </section>
                    <section class="mock-form-section">
                        <div class="mock-form-section__head"><span>4</span><div><h3>Media (optional)</h3></div></div>
                        <label class="mock-upload-box">
                            <input type="file" name="attachments" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple data-media-input>
                            <i class="fa-solid fa-plus"></i>
                            <span>Add photo or video</span>
                        </label>
                    </section>
                    <label class="mock-check"><input type="checkbox" name="permission_to_forward" checked> Allow providers to see enough detail to quote accurately.</label>
                    <div class="mock-form-actions">
                        <button class="btn btn-outline-secondary" type="button" data-view-link="home">Cancel</button>
                        <button class="btn btn-primary btn-lg" type="submit"><i class="fa-solid fa-paper-plane"></i> Post Request</button>
                    </div>
                </form>
            </div>
            <aside class="col-xl-4">
                <div class="mock-side-panel">
                    <div class="mock-side-panel__success"><i class="fa-solid fa-circle-check"></i><div><strong>Ready to post</strong><p>Providers in your area will be notified once you submit.</p></div></div>
                    <div class="mock-side-panel__tips">
                        <strong><i class="fa-regular fa-lightbulb"></i> Tips</strong>
                        <ul>
                            <li>Add clear photos to get better offers.</li>
                            <li>Include your preferred schedule and budget.</li>
                            <li>Keep communication inside KAILA for safety.</li>
                        </ul>
                    </div>
                </div>
            </aside>
        </div>`;
}
