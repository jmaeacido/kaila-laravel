export const csrf = document.querySelector('meta[name="csrf-token"]')?.content || "";
export const cfg = window.KAILA || {};

export const store = {
    loading: true,
    error: "",
    user: cfg.user || null,
    requests: [],
    providers: [],
    notifications: [],
    unreadNotifications: 0,
    supportDesk: null,
    metrics: {},
    categories: cfg.categories || [],
    urgencies: cfg.urgencies || [],
    selectedRequestId: null,
    selectedOfferId: null,
    jobMessages: [],
    directMessages: [],
    listeners: new Set(),
};

export function onStoreChange(listener) {
    store.listeners.add(listener);
    return () => store.listeners.delete(listener);
}

function emitChange() {
    store.listeners.forEach((listener) => listener());
}

export async function api(url, options = {}) {
    const response = await fetch(url, {
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": csrf,
            ...(options.headers || {}),
        },
        credentials: "same-origin",
        ...options,
        body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = payload.message || payload.error || Object.values(payload.errors || {})?.[0]?.[0] || "Request failed.";
        throw new Error(message);
    }
    return payload;
}

export async function refreshState() {
    store.loading = true;
    store.error = "";
    emitChange();
    try {
        const payload = await api("/api/state");
        store.user = payload.user || store.user;
        store.requests = payload.requests || [];
        store.providers = payload.providers || [];
        store.notifications = payload.notifications || [];
        store.unreadNotifications = payload.unreadNotifications || 0;
        store.supportDesk = payload.supportDesk || null;
        store.metrics = payload.metrics || {};
        store.categories = payload.categories || store.categories;
        store.urgencies = payload.urgencies || store.urgencies;
        if (store.selectedRequestId && !store.requests.some((item) => item.id === store.selectedRequestId)) {
            store.selectedRequestId = null;
        }
    } catch (error) {
        store.error = error.message;
    } finally {
        store.loading = false;
        emitChange();
    }
}

export function selectRequest(id) {
    store.selectedRequestId = id ? Number(id) : null;
    store.jobMessages = [];
    emitChange();
}

export function selectedRequest() {
    return store.requests.find((item) => item.id === store.selectedRequestId) || null;
}

export function clientRequests() {
    return store.requests.filter((item) => item.client_id === store.user?.id);
}

export function matchingRequests() {
    const userId = store.user?.id;
    const category = store.user?.provider_profile?.category || store.user?.category;
    return store.requests.filter((item) =>
        item.client_id !== userId
        && ["Posted", "Offers Received", "Countered"].includes(item.status)
        && (!category || item.category === category)
        && !item.offers?.some((offer) => offer.provider_id === userId)
    );
}

export function providerActiveJobs() {
    const userId = store.user?.id;
    return store.requests.filter((item) =>
        item.accepted_provider_id === userId
        && !["Cancelled", "Rated / Closed", "Closed", "Payment Released"].includes(item.status)
    );
}

export function providerOffersSent() {
    const userId = store.user?.id;
    return store.requests.flatMap((item) =>
        (item.offers || [])
            .filter((offer) => offer.provider_id === userId)
            .map((offer) => ({ ...offer, request: item }))
    );
}

export function statusTone(status = "") {
    if (["Posted", "Offers Received"].includes(status)) return "blue";
    if (["Accepted", "In Progress", "Payment Released"].includes(status)) return "green";
    if (["Countered", "Revision Requested", "Provider Marked Done"].includes(status)) return "orange";
    if (["Disputed", "Cancelled"].includes(status)) return "red";
    if (["Rated / Closed", "Closed"].includes(status)) return "purple";
    return "blue";
}

export function statusLabel(status = "") {
    if (status === "Offers Received") return `${countOffers(status)} OFFERS`;
    return status.toUpperCase();
}

function countOffers() {
    return 0;
}

export function requestTitle(request) {
    if (!request) return "";
    const details = String(request.details || "").trim();
    return details.split("\n")[0].slice(0, 80) || `${request.category} request`;
}

export function formatBudget(request) {
    return request?.budget ? `₱${String(request.budget).replace(/^PHP\s?/i, "")}` : "Open budget";
}

export function timeAgo(value) {
    if (!value) return "";
    const date = new Date(value);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
}

export async function createRequest(formData) {
    const payload = await api("/api/requests", {
        method: "POST",
        body: {
            category: formData.category,
            urgency: formData.urgency,
            area: formData.area,
            budget: formData.budget || null,
            preferred_schedule: formData.preferred_schedule || null,
            contact_method: formData.contact_method || "Chat first",
            exact_location_notes: formData.exact_location_notes || null,
            details: formData.details,
            permission_to_forward: formData.permission_to_forward !== false,
            consent_to_rate: formData.consent_to_rate !== false,
            job_lat: formData.job_lat || null,
            job_lng: formData.job_lng || null,
        },
    });
    selectRequest(payload.request?.id);
    await refreshState();
    return payload.request;
}

export async function sendOffer(requestId, body) {
    const payload = await api(`/api/requests/${requestId}/offers`, { method: "POST", body });
    selectRequest(requestId);
    await refreshState();
    return payload.offer;
}

export async function passRequest(requestId) {
    await api(`/api/requests/${requestId}/pass`, { method: "POST", body: {} });
    await refreshState();
}

export async function acceptOffer(requestId, offerId) {
    const payload = await api(`/api/requests/${requestId}/offers/${offerId}/accept`, { method: "POST", body: {} });
    selectRequest(requestId);
    await refreshState();
    return payload.request;
}

export async function jobAction(requestId, action, extra = {}) {
    const payload = await api(`/api/requests/${requestId}/action`, {
        method: "POST",
        body: { action, ...extra },
    });
    selectRequest(requestId);
    await refreshState();
    return payload.request;
}

export async function loadJobMessages(requestId) {
    const payload = await api(`/api/requests/${requestId}/messages`);
    store.jobMessages = payload.messages || [];
    emitChange();
    return store.jobMessages;
}

export async function sendJobMessage(requestId, body) {
    const payload = await api(`/api/requests/${requestId}/messages`, {
        method: "POST",
        body: { body },
    });
    await loadJobMessages(requestId);
    return payload.message;
}

export async function loadDirectMessages(userId) {
    const payload = await api(`/api/direct-conversations/${userId}/messages`);
    store.directMessages = payload.messages || [];
    emitChange();
    return store.directMessages;
}

export async function sendDirectMessage(userId, body) {
    const payload = await api(`/api/direct-conversations/${userId}/messages`, {
        method: "POST",
        body: { body },
    });
    await loadDirectMessages(userId);
    return payload.message;
}

export async function saveProfile(body) {
    const payload = await api("/api/profile", { method: "POST", body });
    store.user = payload.user;
    emitChange();
    return payload.user;
}

export async function saveProvider(body) {
    const payload = await api("/api/providers", {
        method: "POST",
        body: { ...body, rules_agreement: true },
    });
    await refreshState();
    return payload.provider;
}

export async function reportJob(requestId, reason, details) {
    await api("/api/reports/job", {
        method: "POST",
        body: { service_request_id: requestId, reason, details },
    });
}

export async function reportUser(userId, reason, details) {
    await api("/api/reports/user", {
        method: "POST",
        body: { reported_user_id: userId, reason, details },
    });
}

export async function blockUser(userId, reason = "") {
    await api(`/api/blocks/${userId}`, { method: "POST", body: { reason } });
}

export async function deleteAccount(confirm) {
    await api("/api/account", {
        method: "DELETE",
        body: { confirm },
    });
    window.location.assign("/login");
}

export async function markNotificationsRead() {
    await api("/api/notifications/read", { method: "POST", body: {} });
    await refreshState();
}

export async function startNavigation(requestId) {
    return api(`/api/navigation/${requestId}/start`, { method: "POST", body: {} });
}

export async function updateNavigation(requestId, lat, lng) {
    return api(`/api/navigation/${requestId}/location`, {
        method: "POST",
        body: { lat, lng },
    });
}

export async function stopNavigation(requestId) {
    return api(`/api/navigation/${requestId}/stop`, { method: "POST", body: {} });
}

export async function logout() {
    await fetch("/auth/logout", {
        method: "POST",
        headers: { "X-CSRF-TOKEN": csrf, Accept: "application/json" },
        credentials: "same-origin",
    }).catch(() => {});
    window.location.assign("/login");
}

export function providerForRequest(request) {
    if (!request) return null;
    if (request.accepted_provider) return request.accepted_provider;
    const acceptedOffer = request.offers?.find((offer) => offer.status === "accepted");
    return acceptedOffer?.provider || request.offers?.[0]?.provider || null;
}

export function offerCount(request) {
    return request?.offers?.length || 0;
}

export function clientMetrics() {
    return store.metrics?.client || {
        postedRequests: clientRequests().length,
        activeJobs: clientRequests().filter((item) => ["Accepted", "In Progress", "Provider Marked Done", "Revision Requested"].includes(item.status)).length,
        offersReceived: clientRequests().reduce((sum, item) => sum + offerCount(item), 0),
        completedJobs: clientRequests().filter((item) => ["Payment Released", "Rated / Closed", "Closed"].includes(item.status)).length,
        averageRating: null,
    };
}

export function providerMetrics() {
    return store.metrics?.provider || {
        matchingRequests: matchingRequests().length,
        offersSent: providerOffersSent().length,
        acceptedJobs: providerActiveJobs().length,
        activeJobs: providerActiveJobs().filter((item) => ["Accepted", "In Progress", "Provider Marked Done", "Revision Requested"].includes(item.status)).length,
        completedJobs: 0,
        averageRating: null,
        reviewCount: 0,
    };
}
