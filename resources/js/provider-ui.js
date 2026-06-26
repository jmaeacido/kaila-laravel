import {
    jobAction,
    loadDirectMessages,
    loadFeed,
    loadJobMessages,
    matchingRequests,
    passRequest,
    providerActiveJobs,
    canStartNavigation,
    providerMetrics,
    providerOffersSent,
    refreshState,
    saveProvider,
    selectRequest,
    selectedRequest,
    sendDirectMessage,
    sendJobMessage,
    sendOffer,
    startNavigation,
    stopNavigation,
    statusTone,
    store,
    timeAgo,
    updateNavigation,
    requestTitle,
    formatBudget,
} from "./kaila-api.js";
import { attachmentsFromForm, renderAttachments } from "./kaila-media.js";
import {
    assistantScreen,
    activityScreen,
    bindAssistantActions,
    bindFeedActions,
    bindNotificationActions,
    bindSupportHubActions,
    callScreen,
    feedScreen,
    marketplaceSupportScreen,
} from "./kaila-shared-screens.js";
import { bindCallActions } from "./kaila-webrtc.js";
import {
    mockInboxShell,
    mockPageHero,
    providerMatchingCard,
    providerQuickActions,
    providerStatRow,
} from "./kaila-mock-ui.js";
import {
    avatar,
    card,
    createApp,
    escapeHtml,
    firstName,
    icon,
    pill,
    sectionHead,
} from "./kaila-ui-core.js";
import { renderRouteMap } from "./kaila-maps.js";

const providerName = () => store.user?.name || "Provider";
const area = () => store.user?.area || store.user?.provider_profile?.area || "Your area";
const categories = () => store.categories || [];
let loadedProviderJobMessagesFor = null;
let loadedProviderSupportFor = null;
let loadedProviderFeed = false;

const navItems = [
    ["home", "Dashboard", "fa-gauge-high", "/home"],
    ["requests", "Matching Requests", "fa-magnifying-glass", "/requests"],
    ["jobs", "Active Jobs", "fa-briefcase", "/jobs"],
    ["feed", "Feed", "fa-users", "/feed"],
    ["inbox", "Inbox", "fa-comment-dots", "/messages"],
    ["notifications", "Activity", "fa-bell", "/notifications"],
    ["settings", "Settings", "fa-gear", "/settings"],
    ["offers", "Offers Sent", "fa-paper-plane", "/jobs#offers"],
    ["detail", "Request Detail", "fa-file-lines", "/requests#detail"],
    ["send-offer", "Send Offer", "fa-tag", "/requests#send-offer"],
    ["job-detail", "Accepted Job", "fa-clipboard-check", "/jobs#detail"],
    ["chat", "Job Chat", "fa-comments", "/messages#chat"],
    ["call", "Call", "fa-video", "/messages#call"],
    ["travel", "Travel", "fa-location-dot", "/jobs#travel"],
    ["mark-done", "Mark Done", "fa-circle-check", "/jobs#mark-done"],
    ["support", "Support", "fa-headset", "/support"],
    ["assistant", "Katabang", "fa-wand-magic-sparkles", "/assistant"],
    ["delete", "Delete Account", "fa-trash", "/settings#delete"],
];

const routeViews = {
    "/home": "home",
    "/requests": "requests",
    "/jobs": "jobs",
    "/feed": "feed",
    "/messages": "inbox",
    "/assistant": "assistant",
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

function jobRow(item) {
    return `
        <button class="mock-home-request" type="button" data-select-request="${item.id}" data-view-link="job-detail">
            <span class="mock-thumb"><i class="fa-solid fa-briefcase"></i></span>
            <span class="mock-home-request__body">
                <strong>${escapeHtml(requestTitle(item))}</strong>
                <small>${escapeHtml(item.area)} · ${escapeHtml(item.status)}</small>
            </span>
            <span class="mock-home-request__end">${pill(item.status, statusTone(item.status))}</span>
            <i class="fa-solid fa-chevron-right"></i>
        </button>`;
}

const screens = {
    home() {
        const matching = matchingRequests().slice(0, 3);
        const active = providerActiveJobs().slice(0, 3);
        const stats = providerMetrics();
        return `
            ${mockPageHero("", subtitles.home, providerName())}
            ${providerStatRow(stats)}
            <div class="my-4">${providerQuickActions()}</div>
            <div class="row g-4">
                <div class="col-lg-7">
                    ${sectionHead("Latest Matching Requests", `<button class="btn btn-link p-0" type="button" data-view-link="requests">View all</button>`)}
                    ${matching.length ? matching.map(providerMatchingCard).join("") : `<div class="mock-match-card"><p class="mock-empty mb-0">No matching requests right now.</p></div>`}
                </div>
                <div class="col-lg-5">
                    ${card(`${sectionHead("Active Jobs", `<button class="btn btn-link p-0" type="button" data-view-link="jobs">View all</button>`)}
                        ${active.length ? active.map(jobRow).join("") : `<p class="mock-empty">No active jobs.</p>`}
                    `)}
                </div>
            </div>`;
    },
    requests() {
        const items = matchingRequests();
        return `
            ${mockPageHero("Matching Requests", subtitles.requests)}
            ${items.length ? items.map(providerMatchingCard).join("") : `<div class="kaila-card"><p class="mock-empty">No open requests in your category.</p></div>`}`;
    },
    jobs() {
        const items = providerActiveJobs();
        return `
            ${mockPageHero("Active Jobs", subtitles.jobs)}
            ${card(items.length ? items.map(jobRow).join("") : `<p class="mock-empty">No active jobs.</p>`)}`;
    },
    offers() {
        const offers = providerOffersSent();
        return `
            ${mockPageHero("Offers Sent", "Track every offer you've submitted.")}
            ${card(offers.length ? offers.map(({ request, ...offer }) => `
                <div class="mock-home-request">
                    <span class="mock-home-request__body">
                        <strong>${escapeHtml(requestTitle(request))}</strong>
                        <small>${escapeHtml(offer.amount)} · ${escapeHtml(offer.status || "pending")}</small>
                    </span>
                </div>`).join("") : `<p class="mock-empty">No offers sent yet.</p>`)}`;
    },
    detail() {
        const job = currentJob();
        return card(job ? `
            <strong>${escapeHtml(requestTitle(job))}</strong>
            <p class="text-muted">${escapeHtml(job.details || "")}</p>
            <div class="d-flex gap-2 mt-3">
                <button class="btn btn-outline-secondary btn-sm" type="button" data-pass-request="${job.id}">Pass</button>
                <button class="btn btn-primary btn-sm" type="button" data-view-link="send-offer">Send Offer</button>
            </div>` : `<p class="mock-empty">Select a request.</p>`);
    },
    "send-offer"() {
        const job = currentJob();
        return card(`
            <form data-provider-offer>
                <h2 class="h5">${escapeHtml(requestTitle(job))}</h2>
                <div class="mb-3"><label class="form-label">Your price</label><input class="form-control" name="amount" required placeholder="PHP 950"></div>
                <div class="mb-3"><label class="form-label">Schedule</label><input class="form-control" name="schedule" placeholder="Today 4 PM"></div>
                <div class="mb-3"><label class="form-label">Message</label><textarea class="form-control" name="notes"></textarea></div>
                <button class="btn btn-primary btn-lg" type="submit"><i class="fa-solid fa-paper-plane"></i> Send Offer</button>
            </form>`);
    },
    "job-detail"() {
        const job = currentJob();
        return card(job ? `
            <strong>${escapeHtml(requestTitle(job))}</strong>
            <p class="text-muted">${escapeHtml(job.area)} · ${escapeHtml(job.status)}</p>
            <div class="d-flex gap-2 flex-wrap mt-3">
                ${job.status === "Accepted" || job.status === "Revision Requested" ? `<button class="btn btn-primary btn-sm" type="button" data-job-action="start">Start job</button>` : ""}
                ${job.status === "In Progress" || job.status === "Revision Requested" ? `<button class="btn btn-outline-primary btn-sm" type="button" data-view-link="mark-done">Mark done</button>` : ""}
                <button class="btn btn-outline-primary btn-sm" type="button" data-view-link="chat">Message</button>
                ${canStartNavigation(job) ? `<button class="btn btn-outline-primary btn-sm" type="button" data-nav-start="${job.id}">Start navigation</button>` : ""}
            </div>` : `<p class="mock-empty">Select a job.</p>`);
    },
    chat() {
        const threads = providerActiveJobs();
        const job = currentJob();
        return mockInboxShell({
            threads,
            messages: store.jobMessages,
            activeTitle: job?.client?.name || "Client",
            activeSub: job ? requestTitle(job) : "Job conversations",
            composeAttr: "data-provider-chat",
            supportCount: store.supportDesk ? 1 : 0,
            callPeerId: job?.client_id || job?.client?.id || null,
            callRequestId: job?.id || "",
        });
    },
    call() {
        const job = currentJob();
        const client = job?.client;
        return callScreen({
            peerName: client?.name || "Client",
            peerPhoto: client?.social_photo_url || "",
            subtitle: client ? "Start a voice or video call from job chat." : "Select a job conversation first.",
        });
    },
    inbox() { return screens.chat(); },
    travel() {
        const job = currentJob();
        const nav = job?.navigation_state;
        const canNavigate = canStartNavigation(job);
        const navActive = nav?.status === "traveling";
        return card(`
            <div class="kaila-route-panel">
                <div class="kaila-route-summary">
                    <div>
                        <h3 class="mb-1">Travel / Navigation</h3>
                        <p class="text-muted mb-0">${nav?.distance_meters ? `${Math.round(nav.distance_meters / 100) / 10} km` : canNavigate ? "Ready to start travel to the job site." : "Navigation unavailable for this job status."} · ETA ${nav?.eta_minutes || "—"} min</p>
                    </div>
                    <div class="d-flex gap-2 flex-wrap">
                        ${canNavigate && !navActive ? `<button class="btn btn-primary" type="button" data-nav-start="${job?.id || ""}"><i class="fa-solid fa-location-arrow"></i> Start navigation</button>` : ""}
                        ${navActive ? `<button class="btn btn-primary" type="button" data-provider-location-update="${job?.id || ""}"><i class="fa-solid fa-location-crosshairs"></i> Share current location</button>` : ""}
                        ${navActive ? `<button class="btn btn-outline-danger" type="button" data-provider-stop-navigation="${job?.id || ""}"><i class="fa-solid fa-stop"></i> Stop</button>` : ""}
                    </div>
                </div>
                <div class="kaila-route-map" data-provider-route-map></div>
            </div>`);
    },
    "mark-done"() {
        return card(`
            <form data-provider-complete>
                <h2 class="h5">Mark job done</h2>
                <div class="mb-3"><label class="form-label">Completion notes</label><textarea class="form-control" name="proof_note" required></textarea></div>
                <button class="btn btn-success btn-lg" type="submit"><i class="fa-solid fa-circle-check"></i> Submit completion</button>
            </form>`);
    },
    support() {
        return marketplaceSupportScreen({
            composeAttr: "data-provider-support",
            activePanel: "chat",
        });
    },
    notifications() {
        return activityScreen({ title: "Activity", subtitle: subtitles.notifications });
    },
    settings() {
        const profile = store.user?.provider_profile || {};
        return `
            ${mockPageHero("Provider Settings", subtitles.settings)}
            <div class="row g-4">
                <div class="col-lg-8">${card(`
                    <form data-provider-profile>
                        <div class="row g-3">
                            <div class="col-md-6"><label class="form-label">Display name</label><input class="form-control" name="display_name" value="${escapeHtml(profile.display_name || providerName())}"></div>
                            <div class="col-md-6"><label class="form-label">Category</label><select class="form-select" name="category">${categories().map((item) => `<option ${item === (profile.category || specialties()) ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}</select></div>
                            <div class="col-md-6"><label class="form-label">Service area</label><input class="form-control" name="area" value="${escapeHtml(profile.area || area())}"></div>
                            <div class="col-md-6"><label class="form-label">Availability</label><input class="form-control" name="availability" value="${escapeHtml(profile.availability || "Available")}"></div>
                            <div class="col-12"><label class="form-label">Services offered</label><textarea class="form-control" name="specific_services">${escapeHtml(profile.specific_services || "")}</textarea></div>
                        </div>
                        <input type="hidden" name="rules_agreement" value="1">
                        <button class="btn btn-primary mt-3" type="submit">Save profile</button>
                    </form>
                `)}</div>
                <div class="col-lg-4">${card(`
                    <div class="mock-trust-card mb-3">
                        <i class="fa-solid fa-circle-check"></i>
                        <div><strong>Profile Status: Active</strong><p>You are receiving matching requests.</p></div>
                    </div>
                    <button class="btn btn-danger w-100" data-logout><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
                `)}</div>
            </div>`;
    },
    feed: feedScreen,
    assistant: assistantScreen,
    delete() {
        return card(`
            <form data-provider-delete>
                <div class="mb-3"><label class="form-label">Type DELETE</label><input class="form-control" name="confirm" required></div>
                <button class="btn btn-danger" type="submit">Delete account</button>
            </form>`);
    },
};

function specialties() {
    return store.user?.provider_profile?.category || store.user?.category || "Services";
}

export function initProviderApp() {
    return createApp({
        role: "provider",
        navItems,
        routeViews,
        screens,
        storeActions: { selectRequest },
        sidebarPostButton: false,
        sidebarExtras: `<div class="mock-trust-card"><i class="fa-solid fa-circle-check"></i><div><strong>Profile Status: Active</strong><p>${escapeHtml(specialties())}</p></div></div>`,
        bottomNav: [
            ["requests", "fa-magnifying-glass", "Requests"],
            ["jobs", "fa-briefcase", "Jobs"],
            ["feed", "fa-users", "Feed"],
            ["inbox", "fa-comment-dots", "Inbox"],
            ["settings", "fa-gear", "Settings"],
        ],
        fabView: "assistant",
        fabIcon: "fa-wand-magic-sparkles",
        getTitle: (view) => view === "home" ? "" : navItems.find(([id]) => id === view)?.[1] || "Dashboard",
        getSubtitle: (view) => subtitles[view] || subtitles.home,
        bindScreenActions: bindProviderScreenActions,
    });
}

function bindProviderScreenActions({ navigate, toast: showToast }) {
    bindFeedActions({ toast: showToast });
    bindAssistantActions({ toast: showToast });
    bindSupportHubActions({ navigate, toast: showToast });
    bindNotificationActions({ navigate, toast: showToast, selectRequestAction: selectRequest });
    bindCallActions({ navigate, toast: showToast });

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
        try {
            await sendOffer(job.id, Object.fromEntries(new FormData(event.target)));
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
        try {
            await jobAction(job.id, "provider_complete", Object.fromEntries(new FormData(event.target)));
            showToast("Completion submitted.");
            navigate("jobs");
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
        const form = event.target;
        try {
            const attachments = await attachmentsFromForm(form);
            await sendJobMessage(job.id, new FormData(form).get("body") || "[media]", attachments);
            form.reset();
        } catch (error) {
            showToast(error.message);
        }
    });

    document.querySelector("[data-provider-support]")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const support = store.supportDesk;
        if (!support) return showToast("Support desk unavailable.");
        const form = event.target;
        try {
            const attachments = await attachmentsFromForm(form);
            await sendDirectMessage(support.id, new FormData(form).get("body"), attachments);
            form.reset();
        } catch (error) {
            showToast(error.message);
        }
    });

    document.querySelectorAll("[data-nav-start]").forEach((button) => {
        button.addEventListener("click", async () => {
            const requestId = button.dataset.navStart;
            const job = store.requests.find((item) => String(item.id) === String(requestId));
            if (!canStartNavigation(job)) {
                showToast(`Navigation is unavailable while the job is ${job?.status || "not active"}.`);
                return;
            }
            try {
                await startNavigation(requestId);
                showToast("Navigation started.");
                navigate("travel");
            } catch (error) {
                showToast(error.message);
            }
        });
    });

    const providerRouteMap = document.querySelector("[data-provider-route-map]");
    if (providerRouteMap) {
        const job = currentJob();
        const nav = job?.navigation_state;
        renderRouteMap(providerRouteMap, {
            destination: { lat: job?.job_lat, lng: job?.job_lng },
            provider: { lat: nav?.provider_lat, lng: nav?.provider_lng },
            label: "Travel route",
        }).catch((error) => showToast(error.message));
    }

    document.querySelector("[data-provider-location-update]")?.addEventListener("click", async (event) => {
        const requestId = event.currentTarget.dataset.providerLocationUpdate;
        if (!requestId) return;
        if (!navigator.geolocation) return showToast("Geolocation is not supported on this device.");
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                await updateNavigation(requestId, position.coords.latitude, position.coords.longitude);
                showToast("Location shared.");
            } catch (error) {
                showToast(error.message);
            }
        }, () => showToast("Could not get your current location."));
    });

    document.querySelector("[data-provider-stop-navigation]")?.addEventListener("click", async (event) => {
        const requestId = event.currentTarget.dataset.providerStopNavigation;
        if (!requestId) return;
        try {
            await stopNavigation(requestId);
            showToast("Navigation stopped.");
        } catch (error) {
            showToast(error.message);
        }
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
    if (document.querySelector("[data-provider-chat]") && job && loadedProviderJobMessagesFor !== job.id) {
        loadedProviderJobMessagesFor = job.id;
        loadJobMessages(job.id).catch(() => {});
    }
    if (document.querySelector("[data-provider-support]") && store.supportDesk && loadedProviderSupportFor !== store.supportDesk.id) {
        loadedProviderSupportFor = store.supportDesk.id;
        loadDirectMessages(store.supportDesk.id).catch(() => {});
    }
    if (document.querySelector("[data-feed-compose]") && !loadedProviderFeed) {
        loadedProviderFeed = true;
        loadFeed().catch(() => {});
    }
}
