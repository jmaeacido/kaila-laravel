const csrf = document.querySelector('meta[name="csrf-token"]')?.content || "";
const cfg = window.KAILA || {};

const user = cfg.user || {};
const categories = cfg.categories?.length ? cfg.categories : ["Plumbing", "Electrical", "Cleaning", "Repair", "Errands", "Home Help"];
const urgencies = cfg.urgencies?.length ? cfg.urgencies : ["ASAP", "Today", "This week", "Flexible"];

const sampleJob = {
    id: "KLA-1048",
    category: "Plumbing",
    title: "Leaking kitchen sink repair",
    area: "Makati City",
    budget: "PHP 1,200 - PHP 1,800",
    schedule: "Today, 3:00 PM - 6:00 PM",
    status: "Provider on the way",
    provider: "Mark Electrical & Plumbing",
    providerShort: "Mark",
    price: "PHP 1,200.00",
    distance: "2.4 km away",
    eta: "14 min",
};

const providers = [
    ["Mark Electrical & Plumbing", "Top Pro", "4.9", "128", "PHP 1,200.00", "Available today", "bg-success-subtle text-success"],
    ["Juan Fix Services", "Verified", "4.8", "96", "PHP 1,450.00", "Can arrive in 45 mins", "bg-primary-subtle text-primary"],
    ["A.C. Home Maintenance", "Fast responder", "4.7", "84", "PHP 1,650.00", "Tomorrow morning", "bg-warning-subtle text-warning"],
    ["Quality Repairs", "Warranty included", "4.6", "71", "PHP 1,350.00", "Today after 5 PM", "bg-info-subtle text-info"],
];

const requests = [
    ["Leaking kitchen sink repair", "Plumbing", "Offers Received", "3 offers", "Today", "PHP 1,200 - PHP 1,800"],
    ["Install ceiling light", "Electrical", "Posted", "Matching", "Tomorrow", "Open budget"],
    ["Deep cleaning before move-in", "Cleaning", "Accepted", "Mark assigned", "Saturday", "PHP 3,000"],
    ["Pick up small appliance", "Errands", "Completed", "Ready to rate", "Yesterday", "PHP 450"],
];

const inbox = [
    ["Mark Electrical & Plumbing", "I am on my way now. ETA is 14 minutes.", "2 min", "2"],
    ["KAILA Support", "Your report was received and queued for review.", "18 min", ""],
    ["Juan Fix Services", "I can bring replacement fittings if needed.", "1 hr", ""],
    ["Quality Repairs", "Thanks for considering my offer.", "Yesterday", ""],
];

const navItems = [
    ["home", "Home", "bi-house-door", "/home"],
    ["post", "Post", "bi-plus-square", "/post"],
    ["requests", "Requests", "bi-card-checklist", "/jobs#requests"],
    ["offers", "Offers", "bi-columns-gap", "/jobs#offers"],
    ["detail", "Job Detail", "bi-briefcase", "/jobs#detail"],
    ["chat", "Job Chat", "bi-chat-dots", "/messages#chat"],
    ["call", "Call", "bi-camera-video", "/messages#call"],
    ["tracking", "Tracking", "bi-geo-alt", "/jobs#tracking"],
    ["completion", "Completion", "bi-check2-circle", "/jobs#completion"],
    ["rating", "Rating", "bi-star", "/jobs#rating"],
    ["dispute", "Dispute", "bi-flag", "/support#dispute"],
    ["block", "Block", "bi-shield-exclamation", "/support#block"],
    ["inbox", "Inbox", "bi-inbox", "/messages#inbox"],
    ["support", "Support", "bi-headset", "/support#support"],
    ["notifications", "Activity", "bi-bell", "/notifications"],
    ["settings", "Settings", "bi-person-gear", "/settings"],
    ["delete", "Delete", "bi-trash3", "/settings#delete"],
];

const routeViews = {
    "/": "home",
    "/home": "home",
    "/post": "post",
    "/jobs": "requests",
    "/messages": "inbox",
    "/notifications": "notifications",
    "/settings": "settings",
    "/support": "support",
};

let activeView = currentView();

function currentView() {
    const hash = window.location.hash.replace("#", "");
    if (navItems.some(([id]) => id === hash)) return hash;
    return routeViews[window.location.pathname] || "home";
}

function money(value) {
    return value.replace("PHP", "PHP");
}

function icon(name, extra = "") {
    return `<i class="bi ${name} ${extra}" aria-hidden="true"></i>`;
}

function card(body, classes = "") {
    return `<div class="card border-0 shadow-sm ${classes}"><div class="card-body">${body}</div></div>`;
}

function statusBadge(label, tone = "primary") {
    return `<span class="badge rounded-pill text-bg-${tone}">${label}</span>`;
}

function avatar(name, tone = "primary") {
    const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    return `<span class="rounded-circle bg-${tone}-subtle text-${tone} d-inline-flex align-items-center justify-content-center fw-bold p-3">${initials}</span>`;
}

function screenTitle() {
    return navItems.find(([id]) => id === activeView)?.[1] || "KAILA";
}

function shell() {
    const root = document.querySelector("#client-app");
    if (!root) return;

    root.innerHTML = `
        <div class="container-fluid">
            <div class="row min-vh-100">
                <aside class="col-lg-2 col-xl-2 d-none d-lg-block bg-white border-end">
                    <div class="position-sticky top-0 py-4">
                        <a class="d-flex align-items-center gap-2 text-decoration-none px-3 mb-4" href="/home" data-view-link="home">
                            <img class="img-fluid w-50" src="/kaila-logo.svg" alt="KAILA">
                        </a>
                        <nav class="nav nav-pills flex-column gap-1 px-3" aria-label="Client pages">
                            ${navItems.map(([id, label, iconName]) => `
                                <button class="nav-link text-start d-flex align-items-center gap-2 ${id === activeView ? "active" : "text-dark"}" type="button" data-view-link="${id}">
                                    ${icon(iconName)}<span>${label}</span>
                                </button>
                            `).join("")}
                        </nav>
                    </div>
                </aside>
                <div class="col-12 col-lg-10 pb-5">
                    <header class="sticky-top bg-light border-bottom">
                        <div class="container-fluid py-3">
                            <div class="d-flex align-items-center justify-content-between gap-3">
                                <div>
                                    <div class="d-flex align-items-center gap-2 d-lg-none mb-2">
                                        <img class="img-fluid w-25" src="/kaila-logo.svg" alt="KAILA">
                                    </div>
                                    <p class="text-uppercase text-primary fw-bold small mb-1">Client marketplace</p>
                                    <h1 class="h3 mb-0">${screenTitle()}</h1>
                                </div>
                                <div class="d-flex align-items-center gap-2">
                                    <button class="btn btn-outline-primary position-relative" type="button" data-view-link="notifications" aria-label="Notifications">
                                        ${icon("bi-bell")}<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill text-bg-danger">4</span>
                                    </button>
                                    <div class="dropdown">
                                        <button class="btn btn-light border d-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown">
                                            ${avatar(user.name || "Ana Client", "primary")}<span class="d-none d-md-inline">${user.name || "Ana Client"}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>
                    <main class="container-fluid py-4" data-screen></main>
                </div>
            </div>
        </div>
        <nav class="navbar fixed-bottom bg-white border-top d-lg-none">
            <div class="container-fluid justify-content-around">
                ${[
                    ["home", "bi-house-door", "Home"],
                    ["requests", "bi-card-checklist", "Jobs"],
                    ["post", "bi-plus-square", "Post"],
                    ["inbox", "bi-chat-dots", "Inbox"],
                    ["settings", "bi-person", "Me"],
                ].map(([id, iconName, label]) => `
                    <button class="btn ${id === activeView ? "btn-primary" : "btn-light"} d-grid gap-1" type="button" data-view-link="${id}">
                        ${icon(iconName)}<span class="small">${label}</span>
                    </button>
                `).join("")}
            </div>
        </nav>
        <div class="toast-container position-fixed bottom-0 end-0 p-3" data-client-toasts></div>
    `;

    document.querySelector("[data-screen]").innerHTML = screens[activeView]?.() || screens.home();
    bindLinks();
    bindUiActions();
}

function bindLinks() {
    document.querySelectorAll("[data-view-link]").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            navigate(button.dataset.viewLink);
        });
    });
}

function navigate(view) {
    activeView = view;
    const item = navItems.find(([id]) => id === view);
    if (item) history.pushState({ view }, "", item[3]);
    shell();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindUiActions() {
    document.querySelectorAll("form").forEach((form) => {
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            toast(form.dataset.toast || "Saved in UI prototype.");
        });
    });
    document.querySelectorAll("[data-toast]").forEach((button) => {
        button.addEventListener("click", () => toast(button.dataset.toast));
    });
    document.querySelector("[data-logout]")?.addEventListener("click", async () => {
        await fetch("/auth/logout", {
            method: "POST",
            headers: { "X-CSRF-TOKEN": csrf, "Accept": "application/json" },
            credentials: "same-origin",
        }).catch(() => {});
        window.location.assign("/login");
    });
}

function toast(message) {
    const host = document.querySelector("[data-client-toasts]");
    if (!host) return;
    const node = document.createElement("div");
    node.className = "toast show align-items-center text-bg-primary border-0";
    node.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close"></button></div>`;
    node.querySelector("button").addEventListener("click", () => node.remove());
    host.appendChild(node);
    setTimeout(() => node.remove(), 3200);
}

function heroActions() {
    return `
        <div class="row g-3">
            ${[
                ["post", "bi-plus-circle", "Post Request", "Start a new service request"],
                ["requests", "bi-card-checklist", "My Requests", "Track every job"],
                ["inbox", "bi-chat-dots", "Message", "Open conversations"],
                ["support", "bi-headset", "Support", "Contact KAILA"],
            ].map(([view, iconName, title, body]) => `
                <div class="col-6 col-xl-3">
                    <button class="card border-0 shadow-sm text-start w-100 h-100" type="button" data-view-link="${view}">
                        <span class="card-body">
                            <span class="d-inline-flex rounded-circle bg-primary-subtle text-primary p-3 mb-3">${icon(iconName, "fs-4")}</span>
                            <span class="d-block fw-bold">${title}</span>
                            <span class="d-block small text-secondary">${body}</span>
                        </span>
                    </button>
                </div>
            `).join("")}
        </div>
    `;
}

function jobSummary() {
    return card(`
        <div class="d-flex justify-content-between gap-3">
            <div>
                <div class="d-flex align-items-center gap-2 mb-2">
                    ${statusBadge(sampleJob.status, "success")}
                    <span class="text-secondary small">${sampleJob.id}</span>
                </div>
                <h2 class="h5 mb-1">${sampleJob.title}</h2>
                <p class="text-secondary mb-0">${sampleJob.area} · ${sampleJob.schedule}</p>
            </div>
            <div class="text-end">
                <div class="fw-bold">${money(sampleJob.price)}</div>
                <div class="small text-secondary">${sampleJob.provider}</div>
            </div>
        </div>
    `);
}

const screens = {
    home() {
        return `
            <div class="row g-4">
                <section class="col-12">
                    <div class="card border-0 shadow-sm text-bg-primary">
                        <div class="card-body p-4 p-xl-5">
                            <div class="row align-items-center g-4">
                                <div class="col-lg-7">
                                    <p class="text-uppercase fw-bold small mb-2">Good morning, ${user.name || "Ana"}!</p>
                                    <h2 class="display-6 fw-bold mb-3">Get trusted local help without losing the job trail.</h2>
                                    <p class="lead mb-4">Post requests, compare offers, chat, track travel, confirm completion, and rate providers from one client workspace.</p>
                                    <div class="d-flex flex-wrap gap-2">
                                        <button class="btn btn-light btn-lg" type="button" data-view-link="post">${icon("bi-plus-circle")} Post request</button>
                                        <button class="btn btn-outline-light btn-lg" type="button" data-view-link="requests">${icon("bi-card-list")} View requests</button>
                                    </div>
                                </div>
                                <div class="col-lg-5">
                                    <div class="row g-3">
                                        ${[["12", "Open requests"], ["3", "New offers"], ["18", "Completed"], ["4.8", "Avg rating"]].map(([value, label]) => `
                                            <div class="col-6">${card(`<div class="display-6 fw-bold">${value}</div><div class="text-secondary">${label}</div>`, "text-dark")}</div>
                                        `).join("")}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                <section class="col-12">${heroActions()}</section>
                <section class="col-xl-8">${recentRequests()}</section>
                <aside class="col-xl-4">
                    ${card(`<h3 class="h5">Safety center</h3><p class="text-secondary">Your job details, reports, blocks, and support conversations stay organized for review.</p><button class="btn btn-outline-primary w-100" type="button" data-view-link="support">${icon("bi-shield-check")} Open support</button>`)}
                </aside>
            </div>
        `;
    },
    post() {
        return `
            <div class="row g-4">
                <section class="col-xl-8">
                    ${card(`
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <div><p class="text-primary fw-bold small text-uppercase mb-1">Post Service Request</p><h2 class="h4 mb-0">Tell providers what you need</h2></div>
                            ${statusBadge("Draft", "secondary")}
                        </div>
                        <form class="row g-3" data-toast="Request submitted in UI prototype.">
                            <div class="col-md-6"><label class="form-label">Service category</label><select class="form-select">${categories.map((item) => `<option>${item}</option>`).join("")}</select></div>
                            <div class="col-md-6"><label class="form-label">Urgency</label><select class="form-select">${urgencies.map((item) => `<option>${item}</option>`).join("")}</select></div>
                            <div class="col-md-6"><label class="form-label">Budget</label><input class="form-control" value="PHP 1,200 - PHP 1,800"></div>
                            <div class="col-md-6"><label class="form-label">Preferred schedule</label><input class="form-control" value="Today, 3:00 PM - 6:00 PM"></div>
                            <div class="col-12"><label class="form-label">Location</label><div class="input-group"><span class="input-group-text">${icon("bi-geo-alt")}</span><input class="form-control" value="Makati City, near Barangay Hall"></div></div>
                            <div class="col-12"><label class="form-label">Request details</label><textarea class="form-control" rows="6">Kitchen sink has a slow leak under the cabinet. Please bring replacement fittings if needed.</textarea></div>
                            <div class="col-12"><label class="form-label">Photos</label><div class="row g-2">${["Leak angle", "Pipe close-up", "Cabinet view"].map((label) => `<div class="col-md-4"><div class="border rounded text-center p-4 bg-light">${icon("bi-image", "fs-2 text-secondary")}<div class="small mt-2">${label}</div></div></div>`).join("")}</div></div>
                            <div class="col-12"><div class="form-check"><input class="form-check-input" type="checkbox" checked><label class="form-check-label">Allow selected providers to see enough job detail to quote accurately.</label></div></div>
                            <div class="col-12"><button class="btn btn-primary btn-lg w-100" type="submit">${icon("bi-send")} Post Request</button></div>
                        </form>
                    `)}
                </section>
                <aside class="col-xl-4">
                    ${card(`<div class="text-center py-4">${icon("bi-send-check", "display-4 text-success")}<h3 class="h5 mt-3">Request Submitted</h3><p class="text-secondary">Matching providers are notified. Offers will appear in comparison view.</p><button class="btn btn-primary w-100" type="button" data-view-link="offers">Go to offers</button></div>`)}
                    ${card(`<h3 class="h6">Request timeline</h3><ol class="list-group list-group-numbered"><li class="list-group-item">Request details</li><li class="list-group-item">Provider matching</li><li class="list-group-item">Offer comparison</li><li class="list-group-item">Accept and chat</li></ol>`, "mt-3")}
                </aside>
            </div>
        `;
    },
    requests() {
        return `
            <div class="row g-4">
                <section class="col-12">
                    ${card(`
                        <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                            <div><p class="text-primary fw-bold small text-uppercase mb-1">My Requests</p><h2 class="h4 mb-0">All client service requests</h2></div>
                            <button class="btn btn-primary" type="button" data-view-link="post">${icon("bi-plus")} New request</button>
                        </div>
                        <div class="row g-2 mb-4">
                            ${["All", "Open", "Accepted", "Completed", "Disputed"].map((item, index) => `<div class="col-auto"><button class="btn ${index === 0 ? "btn-primary" : "btn-outline-primary"}">${item}</button></div>`).join("")}
                        </div>
                        <div class="list-group list-group-flush">
                            ${requests.map(([title, category, status, meta, schedule, budget], index) => `
                                <button class="list-group-item list-group-item-action py-3" type="button" data-view-link="${index === 0 ? "offers" : "detail"}">
                                    <div class="row align-items-center g-3">
                                        <div class="col-md-5"><div class="fw-bold">${title}</div><div class="text-secondary small">${category} · ${schedule}</div></div>
                                        <div class="col-md-2">${statusBadge(status, index === 0 ? "primary" : index === 2 ? "success" : "secondary")}</div>
                                        <div class="col-md-3 text-secondary">${meta}</div>
                                        <div class="col-md-2 text-md-end fw-bold">${budget}</div>
                                    </div>
                                </button>
                            `).join("")}
                        </div>
                    `)}
                </section>
            </div>
        `;
    },
    offers() {
        return `
            <div class="row g-4">
                <section class="col-xl-8">
                    ${jobSummary()}
                    <div class="vstack gap-3 mt-3">
                        ${providers.map(([name, tag, rating, reviews, price, availability, tone], index) => card(`
                            <div class="row align-items-center g-3">
                                <div class="col-md-6 d-flex gap-3 align-items-center">
                                    ${avatar(name, index === 0 ? "success" : "primary")}
                                    <div><h3 class="h6 mb-1">${name} ${index === 0 ? icon("bi-patch-check-fill", "text-primary") : ""}</h3><div class="small text-secondary">${tag} · ${icon("bi-star-fill", "text-warning")} ${rating} (${reviews} reviews)</div></div>
                                </div>
                                <div class="col-md-3"><span class="badge ${tone}">${availability}</span><div class="small text-secondary mt-2">Includes materials check</div></div>
                                <div class="col-md-3 text-md-end"><div class="fw-bold">${price}</div><button class="btn ${index === 0 ? "btn-primary" : "btn-outline-primary"} mt-2" type="button" data-view-link="detail">${index === 0 ? "Accept offer" : "View"}</button></div>
                            </div>
                        `)).join("")}
                    </div>
                </section>
                <aside class="col-xl-4">
                    ${card(`<h3 class="h5">Compare offers</h3><div class="table-responsive"><table class="table align-middle"><tbody><tr><td>Best rating</td><td class="text-end">4.9</td></tr><tr><td>Lowest price</td><td class="text-end">PHP 1,200</td></tr><tr><td>Fastest ETA</td><td class="text-end">45 min</td></tr></tbody></table></div><button class="btn btn-success w-100" type="button" data-view-link="detail">Accept top offer</button>`)}
                </aside>
            </div>
        `;
    },
    detail() {
        return `
            <div class="row g-4">
                <section class="col-xl-8">
                    ${jobSummary()}
                    ${card(`<h3 class="h5 mb-3">Following steps</h3><div class="progress mb-3" role="progressbar"><div class="progress-bar w-75" role="progressbar" aria-valuenow="75" aria-valuemin="0" aria-valuemax="100"></div></div><div class="row g-3">${["Offer accepted", "Chat opened", "Provider traveling", "Completion review", "Rating"].map((step, index) => `<div class="col-md"><div class="border rounded p-3 h-100 ${index < 3 ? "bg-success-subtle" : "bg-light"}"><div class="fw-bold">${index + 1}</div><div class="small">${step}</div></div></div>`).join("")}</div>`, "mt-3")}
                    ${card(`<h3 class="h5">Job details</h3><p>Kitchen sink has a slow leak under the cabinet. Provider may inspect the pipe, replace fittings, and test water flow before marking the job done.</p><div class="row g-2">${["Before photo", "Pipe close-up", "Cabinet access"].map((item) => `<div class="col-md-4"><div class="bg-light border rounded p-4 text-center">${icon("bi-image", "fs-2 text-secondary")}<div class="small mt-2">${item}</div></div></div>`).join("")}</div>`, "mt-3")}
                </section>
                <aside class="col-xl-4">
                    ${card(`<h3 class="h5">Provider</h3><div class="d-flex gap-3 align-items-center mb-3">${avatar(sampleJob.provider, "success")}<div><div class="fw-bold">${sampleJob.provider}</div><div class="small text-secondary">${icon("bi-star-fill", "text-warning")} 4.9 · 128 reviews</div></div></div><div class="d-grid gap-2"><button class="btn btn-primary" type="button" data-view-link="chat">${icon("bi-chat-dots")} Message</button><button class="btn btn-outline-primary" type="button" data-view-link="call">${icon("bi-telephone")} Call</button><button class="btn btn-outline-primary" type="button" data-view-link="tracking">${icon("bi-geo-alt")} Track travel</button></div>`)}
                    ${card(`<h3 class="h6">Job summary</h3><dl class="row mb-0"><dt class="col-5">Price</dt><dd class="col-7">${sampleJob.price}</dd><dt class="col-5">Schedule</dt><dd class="col-7">${sampleJob.schedule}</dd><dt class="col-5">Area</dt><dd class="col-7">${sampleJob.area}</dd></dl>`, "mt-3")}
                </aside>
            </div>
        `;
    },
    chat() {
        return `
            <div class="row g-4">
                <aside class="col-xl-4">${threadList("chat")}</aside>
                <section class="col-xl-8">
                    ${card(`
                        <div class="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
                            <div class="d-flex gap-3 align-items-center">${avatar(sampleJob.provider, "success")}<div><h2 class="h5 mb-0">${sampleJob.provider}</h2><div class="small text-success">Online · ${sampleJob.status}</div></div></div>
                            <div class="btn-group"><button class="btn btn-outline-primary" type="button" data-view-link="call">${icon("bi-telephone")}</button><button class="btn btn-outline-primary" type="button" data-view-link="tracking">${icon("bi-geo-alt")}</button></div>
                        </div>
                        <div class="vstack gap-3 mb-3">
                            <div class="align-self-start bg-light rounded p-3">Hi Ana, I can handle the leak today. Can you send a close-up photo?</div>
                            <div class="align-self-end bg-primary text-white rounded p-3">Yes, here is the pipe under the sink.</div>
                            <div class="align-self-start bg-light rounded p-3">Thanks. I am on my way now. ETA is 14 minutes.</div>
                            <div class="align-self-end bg-primary text-white rounded p-3">Great, please call when you arrive.</div>
                        </div>
                        <form class="input-group" data-toast="Message queued in UI prototype."><input class="form-control" placeholder="Write a job message"><button class="btn btn-primary" type="submit">${icon("bi-send")}</button></form>
                    `)}
                </section>
            </div>
        `;
    },
    call() {
        return `
            <div class="row g-4">
                ${["Voice call", "Incoming call", "Video call", "Call ended"].map((title, index) => `
                    <div class="col-md-6 col-xl-3">
                        <div class="card text-bg-dark border-0 shadow-sm">
                            <div class="card-body text-center py-5">
                                ${avatar(sampleJob.providerShort, index === 2 ? "info" : "primary")}
                                <h3 class="h5 mt-4">${title}</h3>
                                <p class="text-secondary">${sampleJob.provider}</p>
                                <div class="d-flex justify-content-center gap-2">
                                    <button class="btn btn-danger rounded-circle" type="button" data-toast="Call action captured.">${icon("bi-telephone-x")}</button>
                                    <button class="btn btn-success rounded-circle" type="button" data-toast="Call action captured.">${icon(index === 1 ? "bi-telephone" : "bi-mic")}</button>
                                    <button class="btn btn-secondary rounded-circle" type="button" data-toast="Call action captured.">${icon("bi-camera-video")}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;
    },
    tracking() {
        return `
            <div class="row g-4">
                <section class="col-xl-8">
                    ${card(`<div class="ratio ratio-16x9 bg-success-subtle rounded d-flex align-items-center justify-content-center"><div class="text-center">${icon("bi-map", "display-1 text-success")}<h2 class="h4 mt-3">Live provider route</h2><p class="text-secondary">${sampleJob.distance} · ETA ${sampleJob.eta}</p></div></div>`, "p-0")}
                    ${card(`<div class="row g-3 text-center"><div class="col-md-3"><div class="fw-bold">${sampleJob.eta}</div><div class="small text-secondary">ETA</div></div><div class="col-md-3"><div class="fw-bold">${sampleJob.distance}</div><div class="small text-secondary">Distance</div></div><div class="col-md-3"><div class="fw-bold">In transit</div><div class="small text-secondary">Status</div></div><div class="col-md-3"><button class="btn btn-primary w-100" data-view-link="chat">Message</button></div></div>`, "mt-3")}
                </section>
                <aside class="col-xl-4">${card(`<h3 class="h5">Travel updates</h3><ol class="list-group list-group-numbered"><li class="list-group-item">Offer accepted</li><li class="list-group-item">Provider started travel</li><li class="list-group-item">Near your pinned location</li><li class="list-group-item">Arrival confirmation</li></ol>`)}</aside>
            </div>
        `;
    },
    completion() {
        return `
            <div class="row g-4">
                <section class="col-xl-8">
                    ${card(`<div class="text-center py-4">${icon("bi-check-circle-fill", "display-1 text-success")}<h2 class="h4 mt-3">Review job completion</h2><p class="text-secondary">Provider marked the repair done. Confirm only after checking the work.</p></div>`)}
                    ${card(`<h3 class="h5">Completion proof</h3><div class="row g-2 mb-3">${["Fixed pipe", "No active drip", "Cleaned work area"].map((label) => `<div class="col-md-4"><div class="border rounded bg-light text-center p-4">${icon("bi-image", "fs-2 text-secondary")}<div class="small mt-2">${label}</div></div></div>`).join("")}</div><div class="d-grid gap-2 d-md-flex"><button class="btn btn-success" type="button" data-view-link="rating">${icon("bi-check2")} Confirm complete</button><button class="btn btn-outline-warning" type="button" data-toast="Revision requested in UI prototype.">${icon("bi-arrow-counterclockwise")} Request revision</button><button class="btn btn-outline-danger" type="button" data-view-link="dispute">${icon("bi-flag")} Open dispute</button></div>`, "mt-3")}
                </section>
                <aside class="col-xl-4">${card(`<h3 class="h6">Payment hold</h3><div class="display-6 fw-bold">${sampleJob.price}</div><p class="text-secondary">Funds release after completion confirmation.</p>`)}</aside>
            </div>
        `;
    },
    rating() {
        return `
            <div class="row g-4">
                <section class="col-xl-8">
                    ${card(`
                        <div class="text-center mb-4">${avatar(sampleJob.provider, "success")}<h2 class="h4 mt-3">Rate Your Provider</h2><p class="text-secondary">${sampleJob.provider} · ${sampleJob.title}</p></div>
                        <form class="vstack gap-3" data-toast="Rating submitted in UI prototype.">
                            <div class="text-center fs-1 text-warning">${"★".repeat(5)}</div>
                            <textarea class="form-control" rows="5">Mark arrived on time, explained the issue clearly, and fixed the leak.</textarea>
                            <div class="row g-2">${["On time", "Professional", "Clean work", "Fair price"].map((tag) => `<div class="col-md-3"><input class="btn-check" type="checkbox" checked id="${tag.replaceAll(" ", "-")}"><label class="btn btn-outline-primary w-100" for="${tag.replaceAll(" ", "-")}">${tag}</label></div>`).join("")}</div>
                            <button class="btn btn-success btn-lg" type="submit">${icon("bi-star-fill")} Submit Rating</button>
                        </form>
                    `)}
                </section>
                <aside class="col-xl-4">${card(`<h3 class="h6">Rating impact</h3><p class="text-secondary">Your review helps future clients compare providers with more confidence.</p>`)}</aside>
            </div>
        `;
    },
    dispute() {
        return `
            <div class="row g-4">
                <section class="col-xl-8">
                    ${card(`
                        <p class="text-danger fw-bold small text-uppercase mb-1">Report an Issue</p><h2 class="h4">Document what happened</h2>
                        <form class="row g-3" data-toast="Dispute report saved in UI prototype.">
                            ${["Provider did not arrive", "Unsafe behavior", "Work not completed", "Price changed unexpectedly", "Wrong category", "Other"].map((reason) => `<div class="col-md-6"><div class="form-check border rounded p-3"><input class="form-check-input ms-0 me-2" type="radio" name="reason"><label class="form-check-label">${reason}</label></div></div>`).join("")}
                            <div class="col-12"><label class="form-label">Details</label><textarea class="form-control" rows="5"></textarea></div>
                            <div class="col-12"><button class="btn btn-danger btn-lg w-100" type="submit">${icon("bi-send")} Send report to KAILA Support</button></div>
                        </form>
                    `)}
                </section>
                <aside class="col-xl-4">${card(`<h3 class="h6">What support reviews</h3><ul class="list-group list-group-flush"><li class="list-group-item">Job messages</li><li class="list-group-item">Proof photos</li><li class="list-group-item">Offer and payment details</li><li class="list-group-item">Provider response</li></ul>`)}</aside>
            </div>
        `;
    },
    block() {
        return `
            <div class="row g-4">
                <section class="col-xl-8">
                    ${card(`
                        <div class="row g-4 align-items-center">
                            <div class="col-md-7"><p class="text-danger fw-bold small text-uppercase mb-1">Report / Block User</p><h2 class="h4">Limit contact and alert support</h2><p class="text-secondary">Blocking prevents new direct contact while KAILA reviews the report details.</p></div>
                            <div class="col-md-5">${card(`<div class="d-flex gap-3 align-items-center">${avatar(sampleJob.provider, "warning")}<div><div class="fw-bold">${sampleJob.provider}</div><div class="small text-secondary">Accepted provider</div></div></div>`, "bg-warning-subtle")}</div>
                        </div>
                        <form class="row g-3 mt-2" data-toast="Block/report flow saved in UI prototype.">
                            <div class="col-12"><label class="form-label">Reason</label><select class="form-select"><option>Harassment or unsafe behavior</option><option>Spam</option><option>Fraud concern</option><option>Other</option></select></div>
                            <div class="col-12"><label class="form-label">Details</label><textarea class="form-control" rows="4"></textarea></div>
                            <div class="col-md-6"><button class="btn btn-outline-danger w-100" type="submit">${icon("bi-shield-x")} Block user</button></div>
                            <div class="col-md-6"><button class="btn btn-primary w-100" type="submit">${icon("bi-send")} Send report</button></div>
                        </form>
                    `)}
                </section>
                <aside class="col-xl-4">${card(`<h3 class="h6">After blocking</h3><p class="text-secondary">Existing job records remain available for support and dispute review.</p>`)}</aside>
            </div>
        `;
    },
    inbox() {
        return `
            <div class="row g-4">
                <aside class="col-xl-4">${threadList("inbox")}</aside>
                <section class="col-xl-8">
                    ${card(`<h2 class="h4">Inbox</h2><p class="text-secondary">Job conversations and KAILA support threads stay separated.</p><div class="row g-3">${inbox.map(([name, body, time, unread]) => `<div class="col-12"><button class="list-group-item list-group-item-action border rounded p-3 w-100 text-start" type="button" data-view-link="${name.includes("Support") ? "support" : "chat"}"><div class="d-flex justify-content-between"><strong>${name}</strong><span class="small text-secondary">${time}</span></div><div class="text-secondary">${body}</div>${unread ? `<span class="badge text-bg-primary mt-2">${unread} unread</span>` : ""}</button></div>`).join("")}</div>`)}
                </section>
            </div>
        `;
    },
    support() {
        return `
            <div class="row g-4">
                <section class="col-xl-8">
                    ${card(`<div class="d-flex gap-3 align-items-center border-bottom pb-3 mb-3">${avatar("KAILA Support", "primary")}<div><h2 class="h5 mb-0">KAILA Support</h2><div class="small text-success">Usually replies within 10 minutes</div></div></div><div class="vstack gap-3 mb-3"><div class="bg-light rounded p-3">Hi Ana, how can we help with your current job?</div><div class="bg-primary text-white rounded p-3 align-self-end">I want to understand how completion confirmation works.</div><div class="bg-light rounded p-3">Confirm only after checking the repair. You can request revision or report an issue if needed.</div></div><form class="input-group" data-toast="Support message queued in UI prototype."><input class="form-control" placeholder="Message KAILA Support"><button class="btn btn-primary" type="submit">${icon("bi-send")}</button></form>`)}
                </section>
                <aside class="col-xl-4">${card(`<h3 class="h6">Quick support topics</h3><div class="d-grid gap-2"><button class="btn btn-outline-primary" data-view-link="dispute">Report job issue</button><button class="btn btn-outline-primary" data-view-link="block">Report or block user</button><button class="btn btn-outline-primary" data-view-link="delete">Account deletion</button></div>`)}</aside>
            </div>
        `;
    },
    notifications() {
        const items = ["New offer received", "Provider accepted chat invite", "Provider started travel", "Completion proof uploaded", "Rating reminder", "Support replied"];
        return `
            <div class="row g-4">
                <section class="col-xl-8">
                    ${card(`<div class="d-flex justify-content-between align-items-center mb-3"><div><p class="text-primary fw-bold small text-uppercase mb-1">Activity / Notifications</p><h2 class="h4 mb-0">Recent marketplace activity</h2></div><button class="btn btn-outline-primary" data-toast="Notifications marked read.">Mark read</button></div><div class="list-group list-group-flush">${items.map((item, index) => `<button class="list-group-item list-group-item-action py-3" data-view-link="${index < 3 ? "detail" : index === 3 ? "completion" : index === 4 ? "rating" : "support"}"><div class="d-flex gap-3"><span class="rounded-circle bg-${index < 2 ? "primary" : index < 4 ? "success" : "warning"}-subtle p-2">${icon(index < 2 ? "bi-bell" : index < 4 ? "bi-check2-circle" : "bi-info-circle")}</span><div><div class="fw-bold">${item}</div><div class="small text-secondary">${index + 2} minutes ago · ${sampleJob.title}</div></div></div></button>`).join("")}</div>`)}
                </section>
                <aside class="col-xl-4">${card(`<h3 class="h6">Notification settings</h3><div class="form-check form-switch"><input class="form-check-input" type="checkbox" checked><label class="form-check-label">Job updates</label></div><div class="form-check form-switch"><input class="form-check-input" type="checkbox" checked><label class="form-check-label">Messages</label></div><div class="form-check form-switch"><input class="form-check-input" type="checkbox" checked><label class="form-check-label">Support replies</label></div>`)}</aside>
            </div>
        `;
    },
    settings() {
        return `
            <div class="row g-4">
                <section class="col-xl-8">
                    ${card(`<div class="d-flex gap-3 align-items-center mb-4">${avatar(user.name || "Ana Client", "primary")}<div><h2 class="h4 mb-1">Profile & Settings</h2><p class="text-secondary mb-0">${user.email || "ana.client@example.com"}</p></div><button class="btn btn-outline-primary ms-auto">${icon("bi-pencil")} Edit</button></div><form class="row g-3" data-toast="Profile settings saved in UI prototype."><div class="col-md-6"><label class="form-label">Full name</label><input class="form-control" value="${user.name || "Ana Dela Cruz"}"></div><div class="col-md-6"><label class="form-label">Phone</label><input class="form-control" value="+63 900 000 0000"></div><div class="col-12"><label class="form-label">Default area</label><input class="form-control" value="${user.area || "Makati City"}"></div><div class="col-md-6"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" checked><label class="form-check-label">Push notifications</label></div></div><div class="col-md-6"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" checked><label class="form-check-label">Message alerts</label></div></div><div class="col-12"><button class="btn btn-primary" type="submit">Save changes</button></div></form>`)}
                </section>
                <aside class="col-xl-4">${card(`<h3 class="h6">Account</h3><div class="list-group"><button class="list-group-item list-group-item-action" data-view-link="notifications">${icon("bi-bell")} Notification preferences</button><button class="list-group-item list-group-item-action" data-view-link="support">${icon("bi-headset")} Contact support</button><button class="list-group-item list-group-item-action text-danger" data-view-link="delete">${icon("bi-trash3")} Delete account</button><button class="list-group-item list-group-item-action" data-logout>${icon("bi-box-arrow-right")} Logout</button></div>`)}</aside>
            </div>
        `;
    },
    delete() {
        return `
            <div class="row g-4">
                <section class="col-xl-8">
                    ${card(`<p class="text-danger fw-bold small text-uppercase mb-1">Delete Account</p><h2 class="h4">Review before deleting</h2><p class="text-secondary">Account deletion removes login access and anonymizes profile/contact details while keeping job records needed for safety, dispute, and operational history.</p><div class="alert alert-warning">${icon("bi-exclamation-triangle")} You have one active job. Resolve or cancel it before final deletion.</div><div class="row g-3">${["Export data", "Resolve jobs", "Confirm identity", "Delete account"].map((step, index) => `<div class="col-md-3"><div class="border rounded p-3 h-100 ${index < 2 ? "bg-light" : "bg-danger-subtle"}"><div class="fw-bold">${index + 1}</div><div class="small">${step}</div></div></div>`).join("")}</div><form class="mt-4" data-toast="Deletion request captured in UI prototype."><label class="form-label">Type DELETE to continue</label><input class="form-control mb-3"><button class="btn btn-danger">${icon("bi-trash3")} Request account deletion</button></form>`)}
                </section>
                <aside class="col-xl-4">${card(`<h3 class="h6">What stays for records</h3><ul class="list-group list-group-flush"><li class="list-group-item">Job status history</li><li class="list-group-item">Ratings and reports</li><li class="list-group-item">Dispute evidence</li><li class="list-group-item">Support audit trail</li></ul>`)}</aside>
            </div>
        `;
    },
};

function recentRequests() {
    return card(`
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h3 class="h5 mb-0">Recent Requests</h3>
            <button class="btn btn-sm btn-outline-primary" type="button" data-view-link="requests">View all</button>
        </div>
        <div class="list-group list-group-flush">
            ${requests.slice(0, 3).map(([title, category, status, meta]) => `
                <button class="list-group-item list-group-item-action px-0" type="button" data-view-link="detail">
                    <div class="d-flex justify-content-between gap-3">
                        <div><div class="fw-bold">${title}</div><div class="text-secondary small">${category} · ${meta}</div></div>
                        ${statusBadge(status, status === "Accepted" ? "success" : "primary")}
                    </div>
                </button>
            `).join("")}
        </div>
    `);
}

function threadList(active) {
    return card(`
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h2 class="h5 mb-0">${active === "inbox" ? "Conversations" : "Job threads"}</h2>
            <button class="btn btn-sm btn-outline-primary" type="button" data-view-link="support">${icon("bi-headset")}</button>
        </div>
        <div class="list-group">
            ${inbox.map(([name, body, time, unread], index) => `
                <button class="list-group-item list-group-item-action ${index === 0 ? "active" : ""}" type="button" data-view-link="${name.includes("Support") ? "support" : "chat"}">
                    <div class="d-flex justify-content-between"><strong>${name}</strong><span class="small">${time}</span></div>
                    <div class="small">${body}</div>
                    ${unread ? `<span class="badge text-bg-light mt-2">${unread}</span>` : ""}
                </button>
            `).join("")}
        </div>
    `);
}

window.addEventListener("popstate", () => {
    activeView = currentView();
    shell();
});

shell();
