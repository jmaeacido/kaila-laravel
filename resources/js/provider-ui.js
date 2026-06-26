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
const area = user.area || "Quezon City, Metro Manila";
const providerName = user.name || "Juan Dela Cruz";
const specialties = user.category || "Plumbing, Electrical";

const sampleRequest = {
    id: "KLA-2201",
    title: "Fix leaking kitchen pipe",
    client: "Maria Santos",
    category: "Plumbing",
    area: "Quezon City",
    distance: "8.4 km",
    budget: "₱1,500 - ₱2,500",
    schedule: "Today, 2:00 PM - 5:00 PM",
    urgency: "High",
    offers: 6,
    posted: "12 min ago",
};

const matchingRequests = [
    [sampleRequest.title, sampleRequest.client, "Plumbing", sampleRequest.area, sampleRequest.distance, sampleRequest.budget, sampleRequest.urgency, "Posted", sampleRequest.posted, "6"],
    ["Install ceiling fan", "Carlos Reyes", "Electrical", "Makati City", "5.2 km", "₱800 - ₱1,200", "Medium", "Offers Received", "28 min ago", "4"],
    ["Deep clean 2BR condo", "Lisa Tan", "Cleaning", "Pasig City", "11.1 km", "₱2,500 - ₱3,500", "Low", "Posted", "1 hr ago", "2"],
];

const activeJobs = [
    ["Replace bathroom faucet", "Makati City", "In Progress", "orange"],
    ["Repair circuit breaker", "Taguig City", "Accepted", "green"],
];

const navItems = [
    ["home", "Dashboard", "bi-speedometer2", "/home"],
    ["requests", "Matching Requests", "bi-search", "/requests", "12"],
    ["jobs", "Active Jobs", "bi-briefcase", "/jobs", "3"],
    ["offers", "Offers Sent", "bi-send", "/jobs#offers"],
    ["completed", "Completed Jobs", "bi-check2-square", "/jobs#completed"],
    ["earnings", "Earnings", "bi-cash-stack", "/jobs#earnings"],
    ["reviews", "Reviews", "bi-star", "/jobs#reviews"],
    ["availability", "My Availability", "bi-calendar-week", "/settings#availability"],
    ["profile", "My Profile", "bi-person-badge", "/settings#profile"],
    ["inbox", "Inbox", "bi-chat-dots", "/messages", "3"],
    ["notifications", "Activity", "bi-bell", "/notifications"],
    ["settings", "Settings", "bi-gear", "/settings"],
    ["detail", "Request Detail", "bi-file-text", "/requests#detail"],
    ["send-offer", "Send Offer", "bi-tag", "/requests#send-offer"],
    ["offer-sent", "Offer Sent", "bi-send-check", "/requests#offer-sent"],
    ["job-detail", "Accepted Job", "bi-clipboard-check", "/jobs#detail"],
    ["chat", "Job Chat", "bi-chat-left-text", "/messages#chat"],
    ["call", "Call", "bi-camera-video", "/messages#call"],
    ["travel", "Travel", "bi-geo-alt", "/jobs#travel"],
    ["in-progress", "In Progress", "bi-play-circle", "/jobs#in-progress"],
    ["mark-done", "Mark Done", "bi-check-circle", "/jobs#mark-done"],
    ["revision", "Revision", "bi-arrow-repeat", "/jobs#revision"],
    ["dispute", "Dispute", "bi-flag", "/support#dispute"],
    ["rate-client", "Rate Client", "bi-star-half", "/jobs#rate-client"],
    ["support", "Support", "bi-headset", "/support"],
    ["public-profile", "Public Profile", "bi-eye", "/settings#public-profile"],
    ["block", "Block User", "bi-shield-exclamation", "/support#block"],
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

const sidebarProfile = `
    <div class="kaila-sidebar__profile">
        ${avatar(providerName)}
        <div>
            <p class="kaila-sidebar__profile-name">${providerName}</p>
            <p class="kaila-sidebar__profile-meta">${specialties}</p>
            <span class="kaila-sidebar__status">Active</span>
        </div>
    </div>
`;

const sidebarExtras = `
    <div class="kaila-side-card">
        ${icon("bi-check-circle")} <strong>Profile Status: Active</strong>
        Your profile is visible to clients and you are receiving matching requests.
        <a href="#" data-view-link="profile">View Profile</a>
    </div>
    <button class="kaila-btn kaila-btn--primary kaila-btn--block" type="button" data-view-link="support">${icon("bi-headset")} Contact Support</button>
`;

const bottomNav = [
    ["requests", "bi-search", "Requests", "12"],
    ["jobs", "bi-briefcase", "Jobs", "3"],
    ["inbox", "bi-chat-dots", "Inbox", "3"],
    ["notifications", "bi-bell", "Activity"],
    ["settings", "bi-gear", "Settings"],
];

function statCards() {
    const stats = [
        ["bi-people", "12", "Matching Requests", "New", "blue"],
        ["bi-send", "18", "Offers Sent", "This month", "blue"],
        ["bi-check-circle", "7", "Accepted Jobs", "This month", "green"],
        ["bi-briefcase", "3", "Active Jobs", "Ongoing", "orange"],
        ["bi-clipboard-check", "23", "Completed Jobs", "All time", "green"],
        ["bi-star", "4.8", "Average Rating", "(124 reviews)", "orange"],
    ];
    return `<div class="kaila-grid kaila-grid-6">${stats.map(([ic, value, label, sub]) => card(`
        <div class="kaila-stat">
            <span class="kaila-stat__icon" style="background:rgba(8,117,190,0.1);color:var(--kaila-blue)">${icon(ic)}</span>
            <div class="kaila-stat__value">${value}</div>
            <div class="kaila-stat__label">${label}</div>
            <div class="kaila-stat__trend">${sub}</div>
        </div>
    `)).join("")}</div>`;
}

function quickActions() {
    return `<div class="kaila-grid kaila-grid-4">${[
        ["requests", "View Matching Requests", "Review new jobs in your area"],
        ["profile", "Edit Provider Profile", "Update services and coverage"],
        ["inbox", "Messages", "Reply to client questions"],
        ["support", "Support", "Get help from KAILA"],
    ].map(([view, title, sub]) => `
        <button class="kaila-list-item kaila-card kaila-card--flat" type="button" data-view-link="${view}" style="border-bottom:0;padding:16px">
            <span class="kaila-list-item__body"><p class="kaila-list-item__title">${title}</p><p class="kaila-list-item__meta">${sub}</p></span>
            ${icon("bi-arrow-right")}
        </button>
    `).join("")}</div>`;
}

function requestCard([title, client, category, loc, distance, budget, urgency, status, posted, offers], index = 0) {
    const statusTone = status === "Posted" ? "green" : status === "Offers Received" ? "orange" : "red";
    const urgencyTone = urgency === "High" ? "red" : urgency === "Medium" ? "orange" : "blue";
    return card(`
        <div class="kaila-request-card">
            <div class="kaila-request-card__head">
                <div style="display:flex;gap:12px;align-items:center">${avatar(client)}<div><strong>${client}</strong> ${icon("bi-patch-check-fill")}<div style="font-size:0.82rem;color:var(--kaila-muted)">${icon("bi-star-fill")} 4.9 (56)</div></div></div>
                <div style="text-align:right">${pill(status, statusTone)}<div style="font-size:0.75rem;color:var(--kaila-muted);margin-top:4px">${posted}</div></div>
            </div>
            ${pill(category, "blue")} <strong style="display:block;margin:8px 0 4px;font-size:1rem">${title}</strong>
            <p style="margin:0 0 10px;color:var(--kaila-muted);font-size:0.88rem">Client needs help with ${category.toLowerCase()} work. Photos attached for review.</p>
            <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:0.82rem;color:var(--kaila-muted)">
                <span>${icon("bi-geo-alt")} ${loc} · ${distance}</span>
                <span>${icon("bi-calendar")} ${sampleRequest.schedule}</span>
                ${pill(urgency, urgencyTone)}
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;flex-wrap:wrap;gap:10px">
                <div><span style="color:var(--kaila-green);font-weight:800">${budget}</span><div style="font-size:0.78rem;color:var(--kaila-muted)">${offers} offers sent</div></div>
                <div class="kaila-request-card__actions">
                    <button class="kaila-btn kaila-btn--outline" type="button" data-view-link="detail">${icon("bi-eye")} View Details</button>
                    <button class="kaila-btn kaila-btn--outline" type="button" data-toast="Request passed.">Pass</button>
                    <button class="kaila-btn kaila-btn--primary" type="button" data-view-link="send-offer">${index === 1 ? "View Client Counter Offer" : "Send Offer"}</button>
                </div>
            </div>
        </div>
    `, "kaila-card--flat");
}

function requestSummary() {
    return card(`
        <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap">
            <div>
                ${pill(sampleRequest.urgency, "red")} ${pill(sampleRequest.category, "blue")}
                <h3 style="margin:10px 0 4px">${sampleRequest.title}</h3>
                <p style="margin:0;color:var(--kaila-muted);font-size:0.88rem">${sampleRequest.client} · ${sampleRequest.area} · ${sampleRequest.distance}</p>
            </div>
            <div style="text-align:right"><div style="font-weight:800;color:var(--kaila-green)">${sampleRequest.budget}</div><div style="font-size:0.82rem;color:var(--kaila-muted)">${sampleRequest.posted}</div></div>
        </div>
    `);
}

const screens = {
    home() {
        return `
            <p style="font-size:1.35rem;font-weight:800;margin:0 0 18px">${greeting()}, ${firstName(providerName)}! 👋</p>
            ${statCards()}
            <div style="height:18px"></div>
            ${sectionHead("Quick Actions")}
            ${quickActions()}
            <div style="height:18px"></div>
            <div class="kaila-grid kaila-grid-2">
                <div>${sectionHead("Latest Matching Requests", `<button class="kaila-btn kaila-btn--ghost" type="button" data-view-link="requests">View all</button>`)}${matchingRequests.slice(0, 2).map((item, i) => requestCard(item, i)).join("")}</div>
                <div>
                    ${sectionHead("Active Jobs")}
                    ${activeJobs.map(([title, loc, status, tone]) => card(`<strong>${title}</strong><p style="margin:6px 0;color:var(--kaila-muted);font-size:0.85rem">${loc}</p>${pill(status, tone)}`, "kaila-card--flat")).join("")}
                    ${sectionHead("Job Alerts", "", "margin-top:18px")}
                    ${card(`<div class="kaila-list-item" style="border:0;padding:8px 0">${icon("bi-bell")}<span class="kaila-list-item__body"><p class="kaila-list-item__title">New matching request</p><p class="kaila-list-item__meta">Plumbing · 10 min ago</p></span></div><div class="kaila-list-item" style="border:0;padding:8px 0">${icon("bi-check-circle")}<span class="kaila-list-item__body"><p class="kaila-list-item__title">Offer accepted</p><p class="kaila-list-item__meta">Replace bathroom faucet</p></span></div>`, "kaila-card--flat")}
                </div>
            </div>
        `;
    },
    requests() {
        return `
            <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px">
                <button class="kaila-location-chip" type="button">${icon("bi-geo-alt-fill")} ${area}</button>
                <button class="kaila-btn kaila-btn--outline" type="button">${icon("bi-funnel")} Filters</button>
            </div>
            <div class="kaila-tabs">${["All Requests (12)", "Posted (6)", "Offers Received (4)", "Countered (2)"].map((tab, i) => `<button class="kaila-tab ${i === 0 ? "active" : ""}" type="button">${tab}</button>`).join("")}</div>
            ${matchingRequests.map((item, i) => requestCard(item, i)).join("")}
            <div class="kaila-alert kaila-alert--success" style="margin-top:14px">${icon("bi-info-circle")} Passed requests are hidden from your active list. Update filters to adjust what you see.</div>
        `;
    },
    jobs() {
        return card(`
            ${sectionHead("Active Jobs", `<button class="kaila-btn kaila-btn--primary" type="button" data-view-link="requests">${icon("bi-search")} Find requests</button>`)}
            ${activeJobs.map(([title, loc, status, tone], index) => `
                <button class="kaila-list-item" type="button" data-view-link="job-detail">
                    <span class="kaila-list-item__thumb">${icon("bi-briefcase")}</span>
                    <span class="kaila-list-item__body"><p class="kaila-list-item__title">${title}</p><p class="kaila-list-item__meta">${loc}</p></span>
                    <span class="kaila-list-item__end">${pill(status, tone)}</span>
                </button>
            `).join("")}
        `);
    },
    offers() {
        return card(`
            ${sectionHead("Offers Sent")}
            ${[["Fix leaking kitchen pipe", "₱1,800", "Pending"], ["Install ceiling fan", "₱950", "Countered"], ["Deep clean 2BR condo", "₱3,000", "Declined"]].map(([title, price, status]) => {
                const tone = status === "Pending" ? "blue" : status === "Countered" ? "orange" : "red";
                return `<button class="kaila-list-item" type="button" data-view-link="offer-sent"><span class="kaila-list-item__body"><p class="kaila-list-item__title">${title}</p><p class="kaila-list-item__meta">${price}</p></span>${pill(status, tone)}</button>`;
            }).join("")}
        `);
    },
    completed() {
        return card(`${sectionHead("Completed Jobs")}<p style="color:var(--kaila-muted)">23 completed jobs · 4.8 average rating from clients.</p>`);
    },
    earnings() {
        return card(`${sectionHead("Earnings")}<div class="kaila-grid kaila-grid-3"><div class="kaila-stat"><div class="kaila-stat__value">₱18,400</div><div class="kaila-stat__label">This month</div></div><div class="kaila-stat"><div class="kaila-stat__value">₱142,800</div><div class="kaila-stat__label">All time</div></div><div class="kaila-stat"><div class="kaila-stat__value">₱2,450</div><div class="kaila-stat__label">Pending payout</div></div></div>`);
    },
    reviews() {
        return card(`${sectionHead("Reviews")}<div class="kaila-stars">★★★★★</div><p style="color:var(--kaila-muted)">4.8 average from 124 client reviews.</p>`);
    },
    availability() {
        return card(`
            ${sectionHead("My Availability")}
            <form data-kaila-form data-toast="Availability saved in UI prototype.">
                <div class="kaila-grid kaila-grid-2">
                    <div class="kaila-field"><label>Available days</label><input class="kaila-input" value="Mon - Sat"></div>
                    <div class="kaila-field"><label>Hours</label><input class="kaila-input" value="8:00 AM - 6:00 PM"></div>
                    <div class="kaila-field"><label>Travel distance</label><input class="kaila-input" value="15 km"></div>
                    <div class="kaila-field"><label>Status</label><select class="kaila-select"><option selected>Active</option><option>Paused</option></select></div>
                </div>
                <button class="kaila-btn kaila-btn--primary" type="submit">Save availability</button>
            </form>
        `);
    },
    profile() {
        return card(`
            ${sectionHead("Provider Profile")}
            <form data-kaila-form data-toast="Profile saved in UI prototype.">
                <div class="kaila-grid kaila-grid-2">
                    <div class="kaila-field"><label>Display name</label><input class="kaila-input" value="${providerName}"></div>
                    <div class="kaila-field"><label>Provider type</label><select class="kaila-select"><option>Individual</option><option>Shop</option></select></div>
                    <div class="kaila-field"><label>Primary category</label><select class="kaila-select">${categories.map((c, i) => `<option ${i === 0 ? "selected" : ""}>${c}</option>`).join("")}</select></div>
                    <div class="kaila-field"><label>Service area</label><input class="kaila-input" value="${area}"></div>
                    <div class="kaila-field" style="grid-column:1/-1"><label>Services offered</label><textarea class="kaila-textarea">Pipe repair, faucet installation, leak detection, emergency plumbing.</textarea></div>
                </div>
                <button class="kaila-btn kaila-btn--primary" type="submit">Save profile</button>
            </form>
        `);
    },
    detail() {
        return `<div class="kaila-layout-2-wide"><div>
            ${requestSummary()}
            ${card(`<h3 style="margin:0 0 10px">Request details</h3><p style="color:var(--kaila-muted)">Kitchen pipe is leaking under the sink. Client uploaded photos and prefers afternoon service.</p><div class="kaila-grid kaila-grid-3">${["Photo 1", "Photo 2", "Photo 3"].map((label) => `<div class="kaila-card kaila-card--flat" style="text-align:center;padding:24px">${icon("bi-image")}<div style="font-size:0.78rem;margin-top:8px">${label}</div></div>`).join("")}</div>`)}
            <div style="display:flex;gap:8px;margin-top:14px"><button class="kaila-btn kaila-btn--outline" type="button" data-toast="Request passed.">Pass</button><button class="kaila-btn kaila-btn--primary" type="button" data-view-link="send-offer">Send Offer</button></div>
        </div><aside>${card(`<h3 style="margin:0 0 8px">Client</h3><div style="display:flex;gap:12px;align-items:center">${avatar(sampleRequest.client)}<div><strong>${sampleRequest.client}</strong><div style="font-size:0.82rem;color:var(--kaila-muted)">${icon("bi-star-fill")} 4.9 · Verified</div></div></div>`)}</aside></div>`;
    },
    "send-offer"() {
        return `<div class="kaila-layout-2-wide"><div>${card(`
            ${sectionHead("Send Offer")}
            ${requestSummary()}
            <form data-kaila-form data-toast="Offer sent in UI prototype.">
                <div class="kaila-grid kaila-grid-2">
                    <div class="kaila-field"><label>Your price</label><input class="kaila-input" value="₱1,800"></div>
                    <div class="kaila-field"><label>Estimated arrival</label><input class="kaila-input" value="Today, 3:30 PM"></div>
                    <div class="kaila-field" style="grid-column:1/-1"><label>Message to client</label><textarea class="kaila-textarea">I can inspect and repair the leak today. Replacement fittings included if needed.</textarea></div>
                </div>
                <button class="kaila-btn kaila-btn--primary kaila-btn--lg" type="submit">${icon("bi-send")} Send Offer</button>
            </form>
        `)}</div><aside>${card(`<h3 style="margin:0 0 8px">Offer tips</h3><ul style="margin:0;padding-left:18px;color:var(--kaila-muted);font-size:0.85rem;line-height:1.6"><li>State price and schedule clearly</li><li>Mention materials or warranty</li><li>Reply quickly to stand out</li></ul>`)}</aside></div>`;
    },
    "offer-sent"() {
        return card(`<div style="text-align:center;padding:24px 0">${icon("bi-send-check-fill", "fs-1")}<h2 style="margin:12px 0 6px">Offer Sent</h2><p style="color:var(--kaila-muted)">Your offer for ${sampleRequest.title} is waiting for the client to review.</p><button class="kaila-btn kaila-btn--primary" type="button" data-view-link="requests">Back to requests</button></div>`);
    },
    "job-detail"() {
        return `<div class="kaila-layout-2-wide"><div>
            ${card(`<h3 style="margin:0 0 6px">Replace bathroom faucet</h3><p style="margin:0;color:var(--kaila-muted)">Makati City · Accepted · ₱1,450</p>`)}
            ${card(`<div class="kaila-progress"><div class="kaila-progress__bar" style="width:60%"></div></div><div class="kaila-grid kaila-grid-4">${["Offer accepted", "Travel", "In progress", "Mark done"].map((step, i) => `<div class="kaila-card kaila-card--flat" style="padding:12px;${i < 2 ? "background:rgba(16,185,129,0.08)" : ""}"><strong>${i + 1}</strong><div style="font-size:0.78rem;margin-top:4px">${step}</div></div>`).join("")}</div>`)}
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="kaila-btn kaila-btn--primary" type="button" data-view-link="chat">${icon("bi-chat-dots")} Message</button><button class="kaila-btn kaila-btn--outline" type="button" data-view-link="travel">${icon("bi-geo-alt")} Navigate</button><button class="kaila-btn kaila-btn--outline" type="button" data-view-link="in-progress">Start job</button></div>
        </div><aside>${card(`<h3 style="margin:0 0 8px">Client</h3><div style="display:flex;gap:12px;align-items:center">${avatar("Ana Client")}<div><strong>Ana Client</strong><div style="font-size:0.82rem;color:var(--kaila-muted)">${icon("bi-star-fill")} 4.8</div></div></div>`)}</aside></div>`;
    },
    chat() {
        return card(`
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--kaila-line);padding-bottom:12px;margin-bottom:12px">
                <div style="display:flex;gap:12px;align-items:center">${avatar("Ana Client")}<div><strong>Ana Client</strong><div style="font-size:0.82rem;color:var(--kaila-green)">Online</div></div></div>
                <div style="display:flex;gap:8px"><button class="kaila-btn kaila-btn--outline" type="button" data-view-link="call">${icon("bi-telephone")}</button><button class="kaila-btn kaila-btn--outline" type="button" data-view-link="travel">${icon("bi-geo-alt")}</button></div>
            </div>
            <div class="kaila-chat__messages"><div class="kaila-bubble kaila-bubble--in">Hi Juan, can you arrive before 4 PM?</div><div class="kaila-bubble kaila-bubble--out">Yes, I can be there by 3:30 PM with the replacement parts.</div></div>
            <form data-kaila-form data-toast="Message queued." style="display:flex;gap:8px;margin-top:12px"><input class="kaila-input" placeholder="Write a job message"><button class="kaila-btn kaila-btn--primary" type="submit">${icon("bi-send")}</button></form>
        `);
    },
    call() {
        return card(`<div class="kaila-call">${avatar("Ana")}<h3 style="margin:16px 0 6px">Voice call with Ana Client</h3><div class="kaila-call__actions"><button class="kaila-call__btn kaila-call__btn--end" type="button" data-toast="Call ended.">${icon("bi-telephone-x")}</button><button class="kaila-call__btn kaila-call__btn--accept" type="button" data-toast="Call connected.">${icon("bi-mic")}</button></div></div>`);
    },
    travel() {
        return `<div class="kaila-layout-2-wide"><div>
            ${card(`<div class="kaila-map">${icon("bi-map", "fs-1")}<h3 style="margin:12px 0 6px">Travel / Navigation</h3><p style="margin:0;color:var(--kaila-muted)">8.4 km · ETA 22 min</p></div>`, "kaila-card--flat")}
            <div style="display:flex;gap:8px;margin-top:12px"><button class="kaila-btn kaila-btn--primary" type="button" data-toast="Navigation started.">${icon("bi-navigation")} Start navigation</button><button class="kaila-btn kaila-btn--outline" type="button" data-view-link="chat">Message client</button></div>
        </div><aside>${card(`<div class="kaila-stepper">${["Offer accepted", "Started travel", "Arrived on site"].map((step, i) => `<div class="kaila-step ${i < 1 ? "done" : i === 1 ? "active" : ""}"><span class="kaila-step__dot">${i < 1 ? icon("bi-check") : i + 1}</span><div>${step}</div></div>`).join("")}</div>`)}</aside></div>`;
    },
    "in-progress"() {
        return card(`<div style="text-align:center;padding:18px 0">${icon("bi-play-circle-fill", "fs-1")}<h2 style="margin:12px 0 6px">Job In Progress</h2><p style="color:var(--kaila-muted)">Replace bathroom faucet · Started 2:15 PM</p><button class="kaila-btn kaila-btn--primary" type="button" data-view-link="mark-done">${icon("bi-check-circle")} Mark job done</button></div>`);
    },
    "mark-done"() {
        return card(`
            ${sectionHead("Mark Job Done")}
            <form data-kaila-form data-toast="Completion submitted in UI prototype.">
                <div class="kaila-field"><label>Completion notes</label><textarea class="kaila-textarea">Replaced faucet, tested water flow, cleaned work area.</textarea></div>
                <div class="kaila-field"><label>Proof photos</label><div class="kaila-grid kaila-grid-3">${["Before", "After", "Add photo"].map((label) => `<div class="kaila-card kaila-card--flat" style="text-align:center;padding:24px">${icon("bi-image")}<div style="font-size:0.78rem;margin-top:8px">${label}</div></div>`).join("")}</div></div>
                <button class="kaila-btn kaila-btn--success kaila-btn--lg" type="submit">${icon("bi-check2")} Submit completion</button>
            </form>
        `);
    },
    revision() {
        return card(`<div class="kaila-alert kaila-alert--warning">${icon("bi-arrow-repeat")} Client requested a revision. Review the note and update the work before resubmitting completion.</div><textarea class="kaila-textarea">Please tighten the connection under the sink.</textarea><button class="kaila-btn kaila-btn--primary" type="button" data-view-link="in-progress">Return to job</button>`);
    },
    dispute() {
        return card(`
            ${sectionHead("Dispute")}
            <form data-kaila-form data-toast="Dispute saved in UI prototype.">
                <div class="kaila-field"><label>Issue type</label><select class="kaila-select"><option>Client no-show</option><option>Scope changed</option><option>Payment issue</option><option>Other</option></select></div>
                <div class="kaila-field"><label>Details</label><textarea class="kaila-textarea"></textarea></div>
                <button class="kaila-btn kaila-btn--danger kaila-btn--block" type="submit">Submit dispute</button>
            </form>
        `);
    },
    "rate-client"() {
        return card(`
            <div style="text-align:center;margin-bottom:18px">${avatar("Ana Client")}<h2 style="margin:12px 0 6px">Rate Client</h2></div>
            <form data-kaila-form data-toast="Rating submitted."><div class="kaila-stars" style="text-align:center;margin-bottom:14px">★★★★★</div><textarea class="kaila-textarea">Clear instructions and respectful communication.</textarea><button class="kaila-btn kaila-btn--success kaila-btn--block" type="submit">Submit rating</button></form>
        `);
    },
    inbox() {
        return card(`${sectionHead("Provider Inbox")}${[["Ana Client", "Can you arrive before 4 PM?", "5 min", "1"], ["KAILA Support", "Your verification documents were approved.", "1 hr", ""]].map(([name, body, time, unread]) => `<button class="kaila-list-item" type="button" data-view-link="${name.includes("Support") ? "support" : "chat"}"><span class="kaila-list-item__body"><p class="kaila-list-item__title">${name}</p><p class="kaila-list-item__meta">${body}</p></span><span class="kaila-list-item__end">${time}${unread ? pill(unread, "blue") : ""}</span></button>`).join("")}`);
    },
    support() {
        return card(`
            <div style="display:flex;gap:12px;align-items:center;border-bottom:1px solid var(--kaila-line);padding-bottom:12px;margin-bottom:12px">${avatar("KAILA Support")}<div><strong>Provider Support</strong><div style="font-size:0.82rem;color:var(--kaila-green)">Usually replies within 15 minutes</div></div></div>
            <div class="kaila-chat__messages"><div class="kaila-bubble kaila-bubble--in">Hi Juan, how can we help with your provider account?</div></div>
            <form data-kaila-form data-toast="Support message queued." style="display:flex;gap:8px;margin-top:12px"><input class="kaila-input" placeholder="Message provider support"><button class="kaila-btn kaila-btn--primary" type="submit">${icon("bi-send")}</button></form>
        `);
    },
    notifications() {
        return card(`${sectionHead("Activity")}${["New matching request in Plumbing", "Your offer was accepted", "Client sent a message", "Payment reminder for completed job"].map((item, i) => `<button class="kaila-list-item" type="button" data-view-link="${i === 0 ? "requests" : i === 1 ? "job-detail" : i === 2 ? "chat" : "earnings"}"><span class="kaila-list-item__body"><p class="kaila-list-item__title">${item}</p><p class="kaila-list-item__meta">${i + 5} minutes ago</p></span></button>`).join("")}`);
    },
    settings() {
        return `<div class="kaila-layout-2-wide"><div>${screens.profile()}<div style="height:16px"></div>${screens.availability()}</div><aside>${card(`<div style="display:grid;gap:8px"><button class="kaila-btn kaila-btn--outline kaila-btn--block" type="button" data-view-link="public-profile">${icon("bi-eye")} Public profile</button><button class="kaila-btn kaila-btn--outline kaila-btn--block" type="button" data-view-link="support">${icon("bi-headset")} Support</button><button class="kaila-btn kaila-btn--outline kaila-btn--block" type="button" data-view-link="delete">${icon("bi-trash3")} Delete account</button><button class="kaila-btn kaila-btn--danger kaila-btn--block" data-logout>${icon("bi-box-arrow-right")} Logout</button></div>`)}</aside></div>`;
    },
    "public-profile"() {
        return card(`
            ${sectionHead("Public Profile View")}
            <div style="text-align:center;padding:18px 0">${avatar(providerName)}<h2 style="margin:12px 0 4px">${providerName}</h2><p style="color:var(--kaila-muted);margin:0">${specialties} · ${area}</p><div class="kaila-stars" style="margin-top:10px">★★★★★ 4.8 (124)</div></div>
            <p style="color:var(--kaila-muted)">This is how clients see your profile when comparing offers.</p>
            <button class="kaila-btn kaila-btn--primary" type="button" data-view-link="profile">Edit profile</button>
        `);
    },
    block() {
        return card(`
            ${sectionHead("Block / Report User")}
            <form data-kaila-form data-toast="Report saved in UI prototype.">
                <div class="kaila-field"><label>Reason</label><select class="kaila-select"><option>Harassment</option><option>Spam</option><option>Unsafe behavior</option></select></div>
                <div class="kaila-field"><label>Details</label><textarea class="kaila-textarea"></textarea></div>
                <button class="kaila-btn kaila-btn--danger kaila-btn--block" type="submit">Submit report</button>
            </form>
        `);
    },
    delete() {
        return card(`
            ${sectionHead("Delete Account")}
            <p style="color:var(--kaila-muted)">Deleting your account removes login access and hides your provider profile from clients.</p>
            <form data-kaila-form data-toast="Deletion request captured.">
                <div class="kaila-field"><label>Type DELETE to continue</label><input class="kaila-input"></div>
                <button class="kaila-btn kaila-btn--danger" type="submit">Request account deletion</button>
            </form>
        `);
    },
};

createApp({
    theme: "provider",
    navItems,
    routeViews,
    screens,
    bottomNav,
    sidebarProfile,
    sidebarExtras,
    getTitle: (view) => navItems.find(([id]) => id === view)?.[1] || "Dashboard",
    getSubtitle: (view) => subtitles[view] || subtitles.home,
});
