import {
    avatar,
    card,
    cfg,
    createApp,
    firstName,
    greeting,
    icon,
    pill,
    sectionHead,
    user,
} from "./kaila-ui-core.js";

const categories = cfg.categories?.length ? cfg.categories : ["Plumbing", "Electrical", "Cleaning", "Repair", "Errands", "Home Help"];
const urgencies = cfg.urgencies?.length ? cfg.urgencies : ["ASAP", "Today", "This week", "Flexible"];
const area = user.area || "Makati City";

const sampleJob = {
    id: "KLA-1048",
    title: "Leaking kitchen sink repair",
    area: "Makati City",
    budget: "₱1,200 - ₱1,800",
    schedule: "Today, 3:00 PM - 6:00 PM",
    status: "Provider on the way",
    provider: "Mark Electrical & Plumbing",
    providerShort: "Mark",
    price: "₱1,200.00",
    distance: "2.4 km away",
    eta: "14 min",
};

const providers = [
    ["Mark Electrical & Plumbing", "Top Pro", "4.9", "128", "₱1,200.00", "Available today", "green"],
    ["Juan Fix Services", "Verified", "4.8", "96", "₱1,450.00", "Can arrive in 45 mins", "blue"],
    ["A.C. Home Maintenance", "Fast responder", "4.7", "84", "₱1,650.00", "Tomorrow morning", "orange"],
    ["Quality Repairs", "Warranty included", "4.6", "71", "₱1,350.00", "Today after 5 PM", "blue"],
];

const requests = [
    ["Fix leaking faucet", "Plumbing", "3 OFFERS", "Posted 2 days ago", "₱1,200 Budget", "blue", "bi-droplet"],
    ["Install additional outlet", "Electrical", "ACTIVE", "Posted 1 week ago", "₱1,500 Budget", "orange", "bi-lightning"],
    ["Home deep cleaning", "Cleaning", "COMPLETED", "Completed 3 days ago", "5.0 ★ Rated", "green", "bi-house"],
    ["Pick up small appliance", "Errands", "Posted", "Matching", "₱450 Budget", "blue", "bi-bag"],
];

const inbox = [
    ["Mark Electrical & Plumbing", "I am on my way now. ETA is 14 minutes.", "2 min", "2"],
    ["KAILA Support", "Your report was received and queued for review.", "18 min", ""],
    ["Juan Fix Services", "I can bring replacement fittings if needed.", "1 hr", ""],
];

const navItems = [
    ["home", "Home", "bi-house-door", "/home"],
    ["requests", "My Requests", "bi-card-checklist", "/jobs"],
    ["post", "Post Request", "bi-plus-square", "/post"],
    ["inbox", "Inbox", "bi-chat-dots", "/messages", "5"],
    ["notifications", "Activity", "bi-bell", "/notifications", "2"],
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

const sidebarExtras = `
    <div class="kaila-side-card">
        ${icon("bi-shield-check")} <strong>You're in safe hands</strong>
        All providers are verified. Payments are secure. <a href="#" data-view-link="support">Learn more</a>
    </div>
    <button class="kaila-btn kaila-btn--outline kaila-btn--block" type="button" data-view-link="support">${icon("bi-headset")} Help Center</button>
`;

const bottomNav = [
    ["home", "bi-house-door", "Home"],
    ["requests", "bi-card-checklist", "Jobs"],
    ["post", "bi-plus-square", "Post"],
    ["inbox", "bi-chat-dots", "Inbox", "5"],
    ["settings", "bi-person", "Me"],
];

function statCards() {
    const stats = [
        ["bi-send", "12", "Posted Requests", "↗ 2 from last week", "blue"],
        ["bi-briefcase", "3", "Active Jobs", "→ Same as last week", "orange"],
        ["bi-tag", "18", "Offers Received", "↗ 4 from last week", "blue"],
        ["bi-check2-circle", "9", "Completed Jobs", "↗ 3 from last week", "green"],
        ["bi-star", "4.8", "Avg. Rating", "↗ 0.2 from last week", "purple"],
    ];
    return `<div class="kaila-grid kaila-grid-5">${stats.map(([ic, value, label, trend, tone]) => card(`
        <div class="kaila-stat">
            <span class="kaila-stat__icon" style="background:rgba(8,117,190,0.1);color:var(--kaila-${tone === "purple" ? "purple" : tone === "green" ? "green" : tone === "orange" ? "orange" : "blue"})">${icon(ic)}</span>
            <div class="kaila-stat__value">${value}</div>
            <div class="kaila-stat__label">${label}</div>
            <div class="kaila-stat__trend">${trend}</div>
        </div>
    `, "kaila-card--accent")).join("")}</div>`;
}

function actionCards() {
    return `<div class="kaila-grid kaila-grid-4">
        <button class="kaila-action-card kaila-action-card--primary" type="button" data-view-link="post">
            <span class="kaila-action-card__icon">${icon("bi-plus-lg")}</span>
            <span class="kaila-action-card__title">Post Request</span>
            <span class="kaila-action-card__sub">Get offers</span>
        </button>
        ${[
            ["offers", "bi-tags", "View Offers", "Compare offers"],
            ["inbox", "bi-chat-dots", "Messages", "Chat with pros"],
            ["support", "bi-headset", "Support", "Help & FAQ"],
        ].map(([view, ic, title, sub]) => `
            <button class="kaila-action-card" type="button" data-view-link="${view}">
                <span class="kaila-action-card__icon">${icon(ic)}</span>
                <span class="kaila-action-card__title">${title}</span>
                <span class="kaila-action-card__sub">${sub}</span>
            </button>
        `).join("")}
    </div>`;
}

function categoryChips(active = "All") {
    const items = ["All", ...categories.slice(0, 5), "More"];
    const icons = { All: "bi-grid", Plumbing: "bi-droplet", Electrical: "bi-lightning", Cleaning: "bi-bucket", Repair: "bi-tools", Errands: "bi-bag", "Home Help": "bi-house", More: "bi-three-dots" };
    return `<div class="kaila-chips">${items.map((item) => `<button class="kaila-chip ${item === active ? "active" : ""}" type="button">${icons[item] ? icon(icons[item]) + " " : ""}${item}</button>`).join("")}</div>`;
}

function recentRequests() {
    return card(`
        ${sectionHead("Your Recent Requests", `<button class="kaila-btn kaila-btn--ghost" type="button" data-view-link="requests">View all ${icon("bi-chevron-right")}</button>`)}
        ${requests.slice(0, 3).map(([title, category, status, meta, budget, tone, ic], index) => `
            <button class="kaila-list-item" type="button" data-view-link="${index === 0 ? "offers" : "detail"}">
                <span class="kaila-list-item__thumb">${icon(ic)}</span>
                <span class="kaila-list-item__body">
                    <p class="kaila-list-item__title">${title}</p>
                    <p class="kaila-list-item__meta">${area} · ${meta}</p>
                </span>
                <span class="kaila-list-item__end">${pill(status, tone)}<div style="margin-top:6px;font-weight:700;font-size:0.82rem">${budget}</div></span>
                ${icon("bi-chevron-right")}
            </button>
        `).join("")}
    `);
}

function jobSummary() {
    return card(`
        <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap">
            <div>
                ${pill(sampleJob.status, "green")} <span style="color:var(--kaila-muted);font-size:0.82rem;margin-left:8px">${sampleJob.id}</span>
                <h3 style="margin:10px 0 4px;font-size:1.05rem">${sampleJob.title}</h3>
                <p style="margin:0;color:var(--kaila-muted);font-size:0.88rem">${sampleJob.area} · ${sampleJob.schedule}</p>
            </div>
            <div style="text-align:right">
                <div style="font-weight:800;font-size:1.1rem">${sampleJob.price}</div>
                <div style="color:var(--kaila-muted);font-size:0.82rem">${sampleJob.provider}</div>
            </div>
        </div>
    `);
}

function threadList(activeView) {
    return card(`
        ${sectionHead(activeView === "inbox" ? "Conversations" : "Job threads")}
        ${inbox.map(([name, body, time, unread], index) => `
            <button class="kaila-list-item" type="button" data-view-link="${name.includes("Support") ? "support" : "chat"}" style="${index === 0 ? "background:rgba(8,117,190,0.04);border-radius:12px;padding:12px" : ""}">
                ${avatar(name)}
                <span class="kaila-list-item__body">
                    <p class="kaila-list-item__title">${name}</p>
                    <p class="kaila-list-item__meta">${body}</p>
                </span>
                <span class="kaila-list-item__end"><span style="font-size:0.75rem;color:var(--kaila-muted)">${time}</span>${unread ? `<div>${pill(unread, "blue")}</div>` : ""}</span>
            </button>
        `).join("")}
    `);
}

const screens = {
    home() {
        return `
            <p style="font-size:1.35rem;font-weight:800;margin:0 0 18px">${greeting()}, ${firstName(user.name || "Alex")}! 👋</p>
            ${statCards()}
            <div style="height:18px"></div>
            ${actionCards()}
            <div style="height:18px"></div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px">
                <div class="kaila-search" style="flex:1;min-width:240px">${icon("bi-search")}<input placeholder="Search your requests or services..."></div>
                <button class="kaila-btn kaila-btn--outline" type="button">${icon("bi-sliders")} Filter</button>
            </div>
            ${categoryChips()}
            <div style="height:18px"></div>
            ${recentRequests()}
        `;
    },
    post() {
        return `<div class="kaila-layout-2-wide">
            <div>
                ${card(`
                    <h2 style="margin:0 0 6px;font-size:1.2rem">Post a Service Request</h2>
                    <p style="margin:0 0 18px;color:var(--kaila-muted)">Describe what you need and receive offers from verified providers.</p>
                    <div class="kaila-field"><label>Service category</label><div class="kaila-category-grid">${categories.slice(0, 6).map((item, i) => `<button type="button" class="kaila-category ${i === 0 ? "active" : ""}">${icon(categoryIcon(item))}${item}</button>`).join("")}</div></div>
                    <form data-kaila-form data-toast="Request submitted in UI prototype.">
                        <div class="kaila-field"><label>Request title</label><input class="kaila-input" value="Fix leaking faucet in kitchen"></div>
                        <div class="kaila-field"><label>Details</label><textarea class="kaila-textarea">Kitchen sink has a slow leak under the cabinet. Please bring replacement fittings if needed.</textarea></div>
                        <div class="kaila-grid kaila-grid-2">
                            <div class="kaila-field"><label>Budget amount</label><input class="kaila-input" value="₱1,200"></div>
                            <div class="kaila-field"><label>Urgency</label><select class="kaila-select">${urgencies.map((u) => `<option>${u}</option>`).join("")}</select></div>
                            <div class="kaila-field"><label>Preferred date</label><input class="kaila-input" value="May 26, 2025"></div>
                            <div class="kaila-field"><label>Preferred time</label><input class="kaila-input" value="Afternoon (1 PM - 5 PM)"></div>
                            <div class="kaila-field"><label>Service area</label><input class="kaila-input" value="${area}, Metro Manila"></div>
                            <div class="kaila-field"><label>Exact job location</label><input class="kaila-input" value="123 Ayala Ave, Barangay Poblacion"></div>
                        </div>
                        <div class="kaila-field"><label>Photos (optional)</label><div class="kaila-grid kaila-grid-3">${["Leak angle", "Pipe close-up", "Add media"].map((label) => `<div class="kaila-card kaila-card--flat" style="text-align:center;padding:28px 12px">${icon("bi-image", "fs-4")}<div style="font-size:0.78rem;margin-top:8px;color:var(--kaila-muted)">${label}</div></div>`).join("")}</div></div>
                        <label style="display:flex;gap:8px;align-items:flex-start;font-size:0.88rem;margin-bottom:12px"><input type="checkbox" checked> Allow providers to see enough detail to quote accurately.</label>
                        <div style="display:flex;gap:10px;flex-wrap:wrap">
                            <button class="kaila-btn kaila-btn--outline" type="button">Cancel</button>
                            <button class="kaila-btn kaila-btn--primary kaila-btn--lg" type="submit">${icon("bi-send")} Post Request</button>
                        </div>
                    </form>
                `)}
            </div>
            <aside>
                ${card(`<div style="text-align:center">${icon("bi-check-circle-fill", "fs-2")}<h3 style="margin:12px 0 6px">Request posted!</h3><p style="color:var(--kaila-muted);font-size:0.88rem">Matching providers are being notified.</p></div>`, "kaila-alert--success")}
                ${card(`<strong>${sampleJob.title}</strong><p style="color:var(--kaila-muted);font-size:0.85rem;margin:8px 0">${area} · Today · ₱1,200</p>`)}
                ${card(`<h3 style="margin:0 0 12px;font-size:0.95rem">Status</h3><div class="kaila-stepper">
                    ${[["Request posted", "done"], ["Finding matching providers", "active"], ["Offers incoming", ""], ["Select & hire", ""]].map(([label, state]) => `<div class="kaila-step ${state}"><span class="kaila-step__dot">${state === "done" ? icon("bi-check") : ""}</span><div><strong>${label}</strong></div></div>`).join("")}
                </div>`)}
                ${card(`<h3 style="margin:0 0 8px;font-size:0.95rem">Tips</h3><ul style="margin:0;padding-left:18px;color:var(--kaila-muted);font-size:0.85rem;line-height:1.6"><li>More details and photos = better offers</li><li>Set a realistic budget range</li><li>Reply quickly to provider questions</li></ul>`)}
                <button class="kaila-btn kaila-btn--primary kaila-btn--block" type="button" data-view-link="requests">View My Requests</button>
            </aside>
        </div>`;
    },
    requests() {
        return card(`
            ${sectionHead("My Requests", `<button class="kaila-btn kaila-btn--primary" type="button" data-view-link="post">${icon("bi-plus")} New request</button>`)}
            <div class="kaila-tabs">${["All", "Open", "Accepted", "Completed", "Disputed"].map((tab, i) => `<button class="kaila-tab ${i === 0 ? "active" : ""}" type="button">${tab}</button>`).join("")}</div>
            ${requests.map(([title, category, status, meta, budget, tone], index) => `
                <button class="kaila-list-item" type="button" data-view-link="${index === 0 ? "offers" : "detail"}">
                    <span class="kaila-list-item__thumb">${icon(categoryIcon(category))}</span>
                    <span class="kaila-list-item__body"><p class="kaila-list-item__title">${title}</p><p class="kaila-list-item__meta">${category} · ${meta}</p></span>
                    <span class="kaila-list-item__end">${pill(status, tone)}<div style="margin-top:6px;font-weight:700">${budget}</div></span>
                </button>
            `).join("")}
        `);
    },
    offers() {
        return `<div class="kaila-layout-2-wide"><div>
            ${jobSummary()}
            ${providers.map(([name, tag, rating, reviews, price, availability, tone], index) => card(`
                <div class="kaila-offer-row">
                    <div style="display:flex;gap:12px;align-items:center">${avatar(name)}<div><strong>${name}</strong> ${index === 0 ? icon("bi-patch-check-fill") : ""}<div style="font-size:0.82rem;color:var(--kaila-muted)">${tag} · ${icon("bi-star-fill")} ${rating} (${reviews})</div></div></div>
                    <div>${pill(availability, tone)}</div>
                    <div style="text-align:right"><div style="font-weight:800">${price}</div><button class="kaila-btn ${index === 0 ? "kaila-btn--primary" : "kaila-btn--outline"}" type="button" data-view-link="detail">${index === 0 ? "Accept offer" : "View"}</button></div>
                </div>
            `)).join("")}
        </div><aside>${card(`<h3 style="margin:0 0 12px">Compare offers</h3><table class="kaila-table"><tr><td>Best rating</td><td>4.9</td></tr><tr><td>Lowest price</td><td>₱1,200</td></tr><tr><td>Fastest ETA</td><td>45 min</td></tr></table><button class="kaila-btn kaila-btn--success kaila-btn--block" type="button" data-view-link="detail">Accept top offer</button>`)}</aside></div>`;
    },
    detail() {
        return `<div class="kaila-layout-2-wide"><div>
            ${jobSummary()}
            ${card(`<h3 style="margin:0 0 10px">Progress</h3><div class="kaila-progress"><div class="kaila-progress__bar" style="width:75%"></div></div><div class="kaila-grid kaila-grid-5">${["Offer accepted", "Chat opened", "Provider traveling", "Completion review", "Rating"].map((step, i) => `<div class="kaila-card kaila-card--flat" style="padding:12px;${i < 3 ? "background:rgba(16,185,129,0.08)" : ""}"><strong>${i + 1}</strong><div style="font-size:0.78rem;margin-top:4px">${step}</div></div>`).join("")}</div>`)}
            ${card(`<h3 style="margin:0 0 10px">Job details</h3><p style="color:var(--kaila-muted)">Kitchen sink has a slow leak under the cabinet. Provider may inspect the pipe, replace fittings, and test water flow.</p>`)}
        </div><aside>
            ${card(`<h3 style="margin:0 0 12px">Provider</h3><div style="display:flex;gap:12px;align-items:center;margin-bottom:14px">${avatar(sampleJob.provider)}<div><strong>${sampleJob.provider}</strong><div style="font-size:0.82rem;color:var(--kaila-muted)">${icon("bi-star-fill")} 4.9 · 128 reviews</div></div></div>
            <div style="display:grid;gap:8px"><button class="kaila-btn kaila-btn--primary kaila-btn--block" type="button" data-view-link="chat">${icon("bi-chat-dots")} Message</button><button class="kaila-btn kaila-btn--outline kaila-btn--block" type="button" data-view-link="call">${icon("bi-telephone")} Call</button><button class="kaila-btn kaila-btn--outline kaila-btn--block" type="button" data-view-link="tracking">${icon("bi-geo-alt")} Track travel</button></div>`)}
        </aside></div>`;
    },
    chat() {
        return `<div class="kaila-chat">${threadList("chat")}${card(`
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--kaila-line);padding-bottom:12px;margin-bottom:12px">
                <div style="display:flex;gap:12px;align-items:center">${avatar(sampleJob.provider)}<div><strong>${sampleJob.provider}</strong><div style="font-size:0.82rem;color:var(--kaila-green)">Online · ${sampleJob.status}</div></div></div>
                <div style="display:flex;gap:8px"><button class="kaila-btn kaila-btn--outline" type="button" data-view-link="call">${icon("bi-telephone")}</button><button class="kaila-btn kaila-btn--outline" type="button" data-view-link="tracking">${icon("bi-geo-alt")}</button></div>
            </div>
            <div class="kaila-chat__messages">
                <div class="kaila-bubble kaila-bubble--in">Hi, I can handle the leak today. Can you send a close-up photo?</div>
                <div class="kaila-bubble kaila-bubble--out">Yes, here is the pipe under the sink.</div>
                <div class="kaila-bubble kaila-bubble--in">Thanks. I am on my way now. ETA is 14 minutes.</div>
            </div>
            <form data-kaila-form data-toast="Message queued in UI prototype." style="display:flex;gap:8px;margin-top:12px"><input class="kaila-input" placeholder="Write a job message"><button class="kaila-btn kaila-btn--primary" type="submit">${icon("bi-send")}</button></form>
        `)}</div>`;
    },
    call() {
        return `<div class="kaila-grid kaila-grid-2">${["Voice call", "Incoming call", "Video call", "Call ended"].map((title, index) => card(`
            <div class="kaila-call">
                ${avatar(sampleJob.providerShort, "kaila-avatar")}
                <h3 style="margin:16px 0 6px">${title}</h3>
                <p style="opacity:0.72;margin:0">${sampleJob.provider}</p>
                <div class="kaila-call__actions">
                    <button class="kaila-call__btn kaila-call__btn--end" type="button" data-toast="Call ended.">${icon("bi-telephone-x")}</button>
                    <button class="kaila-call__btn kaila-call__btn--accept" type="button" data-toast="Call connected.">${icon(index === 1 ? "bi-telephone" : "bi-mic")}</button>
                    <button class="kaila-call__btn kaila-call__btn--mute" type="button" data-toast="Camera toggled.">${icon("bi-camera-video")}</button>
                </div>
            </div>
        `)).join("")}</div>`;
    },
    tracking() {
        return `<div class="kaila-layout-2-wide"><div>
            ${card(`<div class="kaila-map">${icon("bi-map", "fs-1")}<h3 style="margin:12px 0 6px">Live provider route</h3><p style="margin:0;color:var(--kaila-muted)">${sampleJob.distance} · ETA ${sampleJob.eta}</p></div>`, "kaila-card--flat")}
            ${card(`<div class="kaila-grid kaila-grid-4" style="text-align:center"><div><strong>${sampleJob.eta}</strong><div style="font-size:0.78rem;color:var(--kaila-muted)">ETA</div></div><div><strong>${sampleJob.distance}</strong><div style="font-size:0.78rem;color:var(--kaila-muted)">Distance</div></div><div><strong>In transit</strong><div style="font-size:0.78rem;color:var(--kaila-muted)">Status</div></div><div><button class="kaila-btn kaila-btn--primary kaila-btn--block" type="button" data-view-link="chat">Message</button></div></div>`)}
        </div><aside>${card(`<h3 style="margin:0 0 12px">Travel updates</h3><div class="kaila-stepper">${["Offer accepted", "Provider started travel", "Near your location", "Arrival confirmation"].map((step, i) => `<div class="kaila-step ${i < 2 ? "done" : i === 2 ? "active" : ""}"><span class="kaila-step__dot">${i < 2 ? icon("bi-check") : i + 1}</span><div>${step}</div></div>`).join("")}</div>`)}</aside></div>`;
    },
    completion() {
        return `<div class="kaila-layout-2-wide"><div>
            ${card(`<div style="text-align:center;padding:18px 0">${icon("bi-check-circle-fill", "fs-1")}<h2 style="margin:12px 0 6px">Review job completion</h2><p style="color:var(--kaila-muted);margin:0">Provider marked the repair done. Confirm only after checking the work.</p></div>`)}
            ${card(`<h3 style="margin:0 0 12px">Completion proof</h3><div class="kaila-grid kaila-grid-3">${["Fixed pipe", "No active drip", "Cleaned area"].map((label) => `<div class="kaila-card kaila-card--flat" style="text-align:center;padding:24px">${icon("bi-image")}<div style="font-size:0.78rem;margin-top:8px">${label}</div></div>`).join("")}</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="kaila-btn kaila-btn--success" type="button" data-view-link="rating">${icon("bi-check2")} Confirm complete</button><button class="kaila-btn kaila-btn--outline" type="button" data-toast="Revision requested.">${icon("bi-arrow-counterclockwise")} Request revision</button><button class="kaila-btn kaila-btn--outline" type="button" data-view-link="dispute">${icon("bi-flag")} Open dispute</button></div>`)}
        </div><aside>${card(`<h3 style="margin:0 0 8px">Payment hold</h3><div style="font-size:1.6rem;font-weight:800">${sampleJob.price}</div><p style="color:var(--kaila-muted);font-size:0.88rem">Funds release after completion confirmation.</p>`)}</aside></div>`;
    },
    rating() {
        return `<div class="kaila-layout-2-wide"><div>${card(`
            <div style="text-align:center;margin-bottom:18px">${avatar(sampleJob.provider)}<h2 style="margin:12px 0 6px">Rate Your Provider</h2><p style="color:var(--kaila-muted);margin:0">${sampleJob.provider} · ${sampleJob.title}</p></div>
            <form data-kaila-form data-toast="Rating submitted in UI prototype.">
                <div class="kaila-stars" style="text-align:center;margin-bottom:14px">★★★★★</div>
                <textarea class="kaila-textarea">Mark arrived on time, explained the issue clearly, and fixed the leak.</textarea>
                <div class="kaila-chips" style="margin:12px 0">${["On time", "Professional", "Clean work", "Fair price"].map((tag) => `<span class="kaila-chip active">${tag}</span>`).join("")}</div>
                <button class="kaila-btn kaila-btn--success kaila-btn--lg kaila-btn--block" type="submit">${icon("bi-star-fill")} Submit Rating</button>
            </form>
        `)}</div><aside>${card(`<h3 style="margin:0 0 8px">Rating impact</h3><p style="color:var(--kaila-muted);font-size:0.88rem;margin:0">Your review helps future clients compare providers with more confidence.</p>`)}</aside></div>`;
    },
    dispute() {
        return `<div class="kaila-layout-2-wide"><div>${card(`
            <p style="color:var(--kaila-red);font-weight:800;font-size:0.78rem;text-transform:uppercase;margin:0 0 6px">Report an Issue</p>
            <h2 style="margin:0 0 14px">Document what happened</h2>
            <form data-kaila-form data-toast="Dispute report saved in UI prototype.">
                <div class="kaila-grid kaila-grid-2">${["Provider did not arrive", "Unsafe behavior", "Work not completed", "Price changed", "Wrong category", "Other"].map((reason) => `<label class="kaila-card kaila-card--flat" style="display:flex;gap:8px;align-items:center"><input type="radio" name="reason"> ${reason}</label>`).join("")}</div>
                <div class="kaila-field"><label>Details</label><textarea class="kaila-textarea"></textarea></div>
                <button class="kaila-btn kaila-btn--danger kaila-btn--block" type="submit">${icon("bi-send")} Send report to KAILA Support</button>
            </form>
        `)}</div><aside>${card(`<h3 style="margin:0 0 8px">What support reviews</h3><ul style="margin:0;padding-left:18px;color:var(--kaila-muted);font-size:0.88rem;line-height:1.7"><li>Job messages</li><li>Proof photos</li><li>Offer and payment details</li><li>Provider response</li></ul>`)}</aside></div>`;
    },
    block() {
        return `<div class="kaila-layout-2-wide"><div>${card(`
            <p style="color:var(--kaila-red);font-weight:800;font-size:0.78rem;text-transform:uppercase;margin:0 0 6px">Report / Block User</p>
            <h2 style="margin:0 0 14px">Limit contact and alert support</h2>
            <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px">${avatar(sampleJob.provider)}<div><strong>${sampleJob.provider}</strong><div style="font-size:0.82rem;color:var(--kaila-muted)">Accepted provider</div></div></div>
            <form data-kaila-form data-toast="Block/report flow saved in UI prototype.">
                <div class="kaila-field"><label>Reason</label><select class="kaila-select"><option>Harassment or unsafe behavior</option><option>Spam</option><option>Fraud concern</option><option>Other</option></select></div>
                <div class="kaila-field"><label>Details</label><textarea class="kaila-textarea"></textarea></div>
                <div style="display:flex;gap:8px"><button class="kaila-btn kaila-btn--outline kaila-btn--block" type="submit">${icon("bi-shield-x")} Block user</button><button class="kaila-btn kaila-btn--primary kaila-btn--block" type="submit">${icon("bi-send")} Send report</button></div>
            </form>
        `)}</div><aside>${card(`<p style="color:var(--kaila-muted);font-size:0.88rem;margin:0">Existing job records remain available for support and dispute review after blocking.</p>`)}</aside></div>`;
    },
    inbox() {
        return `<div class="kaila-chat">${threadList("inbox")}${card(`<h2 style="margin:0 0 6px">Inbox</h2><p style="color:var(--kaila-muted);margin:0 0 14px">Job conversations and KAILA support threads.</p>${inbox.map(([name, body, time, unread]) => `<button class="kaila-list-item" type="button" data-view-link="${name.includes("Support") ? "support" : "chat"}"><span class="kaila-list-item__body"><p class="kaila-list-item__title">${name}</p><p class="kaila-list-item__meta">${body}</p></span><span class="kaila-list-item__end">${time}${unread ? pill(unread, "blue") : ""}</span></button>`).join("")}`)}</div>`;
    },
    support() {
        return `<div class="kaila-layout-2-wide"><div>${card(`
            <div style="display:flex;gap:12px;align-items:center;border-bottom:1px solid var(--kaila-line);padding-bottom:12px;margin-bottom:12px">${avatar("KAILA Support")}<div><strong>KAILA Support</strong><div style="font-size:0.82rem;color:var(--kaila-green)">Usually replies within 10 minutes</div></div></div>
            <div class="kaila-chat__messages"><div class="kaila-bubble kaila-bubble--in">Hi, how can we help with your current job?</div><div class="kaila-bubble kaila-bubble--out">I want to understand how completion confirmation works.</div><div class="kaila-bubble kaila-bubble--in">Confirm only after checking the repair. You can request revision or report an issue if needed.</div></div>
            <form data-kaila-form data-toast="Support message queued." style="display:flex;gap:8px;margin-top:12px"><input class="kaila-input" placeholder="Message KAILA Support"><button class="kaila-btn kaila-btn--primary" type="submit">${icon("bi-send")}</button></form>
        `)}</div><aside>${card(`<h3 style="margin:0 0 12px">Quick topics</h3><div style="display:grid;gap:8px"><button class="kaila-btn kaila-btn--outline kaila-btn--block" type="button" data-view-link="dispute">Report job issue</button><button class="kaila-btn kaila-btn--outline kaila-btn--block" type="button" data-view-link="block">Report or block user</button><button class="kaila-btn kaila-btn--outline kaila-btn--block" type="button" data-view-link="delete">Account deletion</button></div>`)}</aside></div>`;
    },
    notifications() {
        const items = ["New offer received", "Provider accepted chat invite", "Provider started travel", "Completion proof uploaded", "Rating reminder", "Support replied"];
        return `<div class="kaila-layout-2-wide"><div>${card(`
            ${sectionHead("Recent Activity", `<button class="kaila-btn kaila-btn--outline" type="button" data-toast="Notifications marked read.">Mark read</button>`)}
            ${items.map((item, index) => `<button class="kaila-list-item" type="button" data-view-link="${index < 3 ? "detail" : index === 3 ? "completion" : index === 4 ? "rating" : "support"}"><span class="kaila-list-item__thumb">${icon("bi-bell")}</span><span class="kaila-list-item__body"><p class="kaila-list-item__title">${item}</p><p class="kaila-list-item__meta">${index + 2} minutes ago · ${sampleJob.title}</p></span></button>`).join("")}
        `)}</div><aside>${card(`<h3 style="margin:0 0 12px">Notification settings</h3>${["Job updates", "Messages", "Support replies"].map((label) => `<label style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:0.88rem"><span>${label}</span><input type="checkbox" checked></label>`).join("")}`)}</aside></div>`;
    },
    settings() {
        return `<div class="kaila-layout-2-wide"><div>${card(`
            <div style="display:flex;gap:12px;align-items:center;margin-bottom:18px">${avatar(user.name || "Alex D.")}<div><h2 style="margin:0 0 4px">Profile & Settings</h2><p style="margin:0;color:var(--kaila-muted);font-size:0.88rem">${user.email || "alex.client@example.com"}</p></div></div>
            <form data-kaila-form data-toast="Profile settings saved in UI prototype.">
                <div class="kaila-grid kaila-grid-2">
                    <div class="kaila-field"><label>Full name</label><input class="kaila-input" value="${user.name || "Alex Dela Cruz"}"></div>
                    <div class="kaila-field"><label>Phone</label><input class="kaila-input" value="+63 900 000 0000"></div>
                    <div class="kaila-field" style="grid-column:1/-1"><label>Default area</label><input class="kaila-input" value="${area}"></div>
                </div>
                <button class="kaila-btn kaila-btn--primary" type="submit">Save changes</button>
            </form>
        `)}</div><aside>${card(`<h3 style="margin:0 0 12px">Account</h3><div style="display:grid;gap:8px"><button class="kaila-btn kaila-btn--outline kaila-btn--block" type="button" data-view-link="notifications">${icon("bi-bell")} Notifications</button><button class="kaila-btn kaila-btn--outline kaila-btn--block" type="button" data-view-link="support">${icon("bi-headset")} Contact support</button><button class="kaila-btn kaila-btn--outline kaila-btn--block" type="button" data-view-link="delete">${icon("bi-trash3")} Delete account</button><button class="kaila-btn kaila-btn--danger kaila-btn--block" data-logout>${icon("bi-box-arrow-right")} Logout</button></div>`)}</aside></div>`;
    },
    delete() {
        return `<div class="kaila-layout-2-wide"><div>${card(`
            <p style="color:var(--kaila-red);font-weight:800;font-size:0.78rem;text-transform:uppercase;margin:0 0 6px">Delete Account</p>
            <h2 style="margin:0 0 10px">Review before deleting</h2>
            <p style="color:var(--kaila-muted)">Account deletion removes login access and anonymizes profile details while keeping job records needed for safety and disputes.</p>
            <div class="kaila-alert kaila-alert--warning">${icon("bi-exclamation-triangle")} You have one active job. Resolve or cancel it before final deletion.</div>
            <form data-kaila-form data-toast="Deletion request captured in UI prototype.">
                <div class="kaila-field"><label>Type DELETE to continue</label><input class="kaila-input"></div>
                <button class="kaila-btn kaila-btn--danger" type="submit">${icon("bi-trash3")} Request account deletion</button>
            </form>
        `)}</div><aside>${card(`<h3 style="margin:0 0 8px">What stays for records</h3><ul style="margin:0;padding-left:18px;color:var(--kaila-muted);font-size:0.88rem;line-height:1.7"><li>Job status history</li><li>Ratings and reports</li><li>Dispute evidence</li><li>Support audit trail</li></ul>`)}</aside></div>`;
    },
};

function categoryIcon(category) {
    return ({
        Plumbing: "bi-droplet",
        Electrical: "bi-lightning",
        Cleaning: "bi-bucket",
        Repair: "bi-tools",
        Errands: "bi-bag",
        "Home Help": "bi-house",
    })[category] || "bi-wrench";
}

createApp({
    theme: "client",
    navItems,
    routeViews,
    screens,
    bottomNav,
    sidebarExtras,
    topbarExtra: `<button class="kaila-location-chip" type="button">${icon("bi-geo-alt-fill")} ${area} ${icon("bi-chevron-down")}</button>`,
    getTitle: (view) => navItems.find(([id]) => id === view)?.[1] || "Home",
    getSubtitle: (view) => subtitles[view] || subtitles.home,
});
