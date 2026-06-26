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
    unreadMessages: 0,
    badgeCounts: {},
    supportDesk: null,
    supportPeerId: null,
    support: {
        queue: [],
        threads: [],
        activities: [],
        permissions: {},
    },
    metrics: {},
    categories: cfg.categories || [],
    urgencies: cfg.urgencies || [],
    selectedRequestId: null,
    selectedOfferId: null,
    jobMessages: [],
    directMessages: [],
    feedPosts: [],
    feedLoaded: false,
    feedFilter: null,
    feedExpandedComments: [],
    assistantMessages: [],
    assistantSuggestions: [],
    analyticsInsight: null,
    incomingCall: null,
    callSession: null,
    selectedProviderId: null,
    providerProfileDetail: null,
    admin: {
        users: [],
        reports: [],
        validationEntries: [],
        auditLogs: [],
        permissions: {},
    },
    listeners: new Set(),
};

export function patchStore(partial) {
    Object.assign(store, partial);
    emitChange();
}

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
        store.unreadMessages = payload.unreadMessages || 0;
        store.badgeCounts = payload.badgeCounts || {};
        store.supportDesk = payload.supportDesk || null;
        store.preferences = payload.preferences || store.preferences || {
            theme: "system",
            push_notifications: true,
            email_notifications: true,
        };
        store.support = payload.support || { queue: [], threads: [], activities: [], permissions: {} };
        store.admin = payload.admin || { users: [], reports: [], validationEntries: [], auditLogs: [], permissions: {} };
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
        applyTheme(store.preferences?.theme || "system");
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

export const NAVIGATION_STATUSES = ["Accepted", "In Progress", "Revision Requested"];

export function canStartNavigation(request) {
    return NAVIGATION_STATUSES.includes(request?.status);
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
            attachments: formData.attachments || [],
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
    await markMessageThreadRead("job", String(requestId));
    emitChange();
    return store.jobMessages;
}

export async function sendJobMessage(requestId, body, attachments = []) {
    const payload = await api(`/api/requests/${requestId}/messages`, {
        method: "POST",
        body: { body, attachments },
    });
    await loadJobMessages(requestId);
    return payload.message;
}

export async function sendDirectMessage(userId, body, attachments = []) {
    const payload = await api(`/api/direct-conversations/${userId}/messages`, {
        method: "POST",
        body: { body, attachments },
    });
    await loadDirectMessages(userId);
    return payload.message;
}

export async function loadDirectMessages(userId) {
    const payload = await api(`/api/direct-conversations/${userId}/messages`);
    store.directMessages = payload.messages || [];
    await markMessageThreadRead("direct", String(userId));
    emitChange();
    return store.directMessages;
}

export async function loadFeed() {
    const payload = await api("/api/feed");
    store.feedPosts = payload.feed || [];
    store.feedLoaded = true;
    emitChange();
    return store.feedPosts;
}

const DEFAULT_FEED_FILTER = {
    search: "",
    role: "all",
    sort: "newest",
    topicLabel: "",
    keywords: [],
};

export function getFeedFilter() {
    return store.feedFilter ? { ...DEFAULT_FEED_FILTER, ...store.feedFilter } : { ...DEFAULT_FEED_FILTER };
}

function feedFilterIsActive(filter) {
    return Boolean(
        filter.search?.trim()
        || (filter.role && filter.role !== "all")
        || (filter.sort && filter.sort !== "newest")
        || (filter.keywords && filter.keywords.length)
    );
}

export function feedFilterSummary(filter = getFeedFilter()) {
    if (!store.feedFilter) return "";
    const parts = [];
    if (filter.topicLabel) parts.push(filter.topicLabel);
    if (filter.search?.trim()) parts.push(`Search: "${filter.search.trim()}"`);
    if (filter.role === "client") parts.push("Clients");
    if (filter.role === "provider") parts.push("Providers");
    if (filter.sort === "liked") parts.push("Most liked");
    if (filter.sort === "commented") parts.push("Most commented");
    return parts.join(" · ");
}

export function patchFeedFilter(patch) {
    const next = { ...getFeedFilter(), ...patch };
    store.feedFilter = feedFilterIsActive(next) ? next : null;
    emitChange();
}

export function setFeedFilter(label, keywords = []) {
    const current = getFeedFilter();
    if (current.topicLabel === label) {
        patchFeedFilter({ topicLabel: "", keywords: [] });
        return;
    }
    patchFeedFilter({ topicLabel: label, keywords });
}

export function clearFeedFilter() {
    store.feedFilter = null;
    emitChange();
}

export function toggleFeedComments(postId) {
    const id = String(postId);
    const expanded = new Set(store.feedExpandedComments || []);
    if (expanded.has(id)) {
        expanded.delete(id);
    } else {
        expanded.add(id);
    }
    store.feedExpandedComments = [...expanded];
    emitChange();
}

export function isFeedCommentsExpanded(postId) {
    return (store.feedExpandedComments || []).includes(String(postId));
}

export async function createFeedPost(body, attachments = []) {
    const payload = await api("/api/feed", {
        method: "POST",
        body: { body, attachments },
    });
    await loadFeed();
    return payload.post;
}

export async function feedReaction(postId, reaction) {
    const payload = await api(`/api/feed/${postId}/reactions`, { method: "POST", body: { reaction } });
    await loadFeed();
    return payload;
}

export async function feedShare(postId) {
    return api(`/api/feed/${postId}/share`, { method: "POST", body: {} });
}

export async function feedComment(postId, body) {
    const payload = await api(`/api/feed/${postId}/comments`, { method: "POST", body: { body } });
    await loadFeed();
    return payload;
}

export async function updateFeedPost(postId, body) {
    const payload = await api(`/api/feed/${postId}`, { method: "PUT", body });
    await loadFeed();
    return payload.post;
}

export async function deleteFeedPost(postId) {
    await api(`/api/feed/${postId}`, { method: "DELETE" });
    await loadFeed();
}

export async function assistantChat(messages) {
    return api("/api/assistant/chat", { method: "POST", body: { messages } });
}

export async function loadAnalytics() {
    store.analyticsInsight = await api("/api/analytics/insights", { method: "POST", body: {} });
    emitChange();
    return store.analyticsInsight;
}

export async function validationDecisionSignal(body) {
    return api("/api/validation/decision-signal", { method: "POST", body });
}

export async function saveValidationEntry(body) {
    const payload = await api("/api/validation", { method: "POST", body });
    await refreshState();
    return payload.entry;
}

export async function updateValidationEntry(entryId, body) {
    const payload = await api(`/api/validation/${entryId}`, { method: "PUT", body });
    await refreshState();
    return payload.entry;
}

export async function deleteValidationEntry(entryId) {
    await api(`/api/validation/${entryId}`, { method: "DELETE" });
    await refreshState();
}

export function isStaffUser() {
    return ["admin", "ops", "customer_service"].includes(store.user?.role);
}

export function isAdminUser() {
    return store.user?.role === "admin";
}

export function isSuperAdminUser() {
    return Boolean(store.admin?.permissions?.isSuperAdmin) || (store.user?.role === "admin" && String(store.user?.username || "").toLowerCase() === "jmaeacido");
}

export function isCustomerServiceUser() {
    return store.user?.role === "customer_service";
}

export function isOpsUser() {
    return store.user?.role === "ops";
}

export function supportMetrics() {
    return store.metrics?.support || {};
}

export function supportQueue() {
    return store.support?.queue || [];
}

export function supportThreads() {
    return store.support?.threads || [];
}

export function supportActivities() {
    return store.support?.activities || [];
}

export function canResolveDisputes() {
    return Boolean(store.support?.permissions?.canResolveDisputes);
}

export function canTriageReports() {
    return Boolean(store.support?.permissions?.canTriageReports || store.admin?.permissions?.isAdmin || isCustomerServiceUser());
}

export function canWriteSupportNotes() {
    return Boolean(store.support?.permissions?.canWriteSupportNotes || store.admin?.permissions?.isAdmin || isCustomerServiceUser());
}

export function selectSupportPeer(userId) {
    store.supportPeerId = userId ? Number(userId) : null;
    store.directMessages = [];
    emitChange();
}

export function supportPeer() {
    const id = store.supportPeerId;
    if (!id) return null;
    return supportDirectoryUsers().find((user) => user.id === id)
        || supportThreads().find((thread) => thread.peer?.id === id)?.peer
        || null;
}

export function supportDirectoryUsers() {
    return (store.admin?.users || []).filter((user) => ["client", "provider"].includes(user.role));
}

export async function supportReportAction(reportId, status, resolution_note = "") {
    return adminReportAction(reportId, status, resolution_note);
}

export async function supportDisputeAction(requestId, action, extra = {}) {
    return jobAction(requestId, action, extra);
}

export async function postSupportNote(detail) {
    const payload = await api("/api/activity", { method: "POST", body: { detail } });
    await refreshState();
    return payload.activity;
}

export async function loadSupportJobMessages(requestId) {
    selectRequest(requestId);
    return loadJobMessages(requestId);
}

export function canManageAccount(user) {
    if (!isAdminUser() || !user) return false;
    if (String(user.username || "").toLowerCase() === "jmaeacido") return isSuperAdminUser() && user.id === store.user?.id;
    if (user.role === "admin") return isSuperAdminUser();
    return true;
}

export async function adminCreateUser(body) {
    const payload = await api("/api/admin/users", { method: "POST", body });
    await refreshState();
    return payload.user;
}

export async function adminUpdateUser(userId, body) {
    const payload = await api(`/api/admin/users/${userId}`, { method: "PUT", body });
    await refreshState();
    return payload.user;
}

export async function adminUserStatus(userId, status, reason = "") {
    const payload = await api(`/api/admin/users/${userId}/status`, { method: "POST", body: { status, reason } });
    await refreshState();
    return payload.user;
}

export async function adminProviderProfile(userId, body) {
    const payload = await api(`/api/admin/users/${userId}/provider-profile`, { method: "POST", body: { ...body, rules_agreement: true } });
    await refreshState();
    return payload.provider;
}

export async function adminReportAction(reportId, status, resolution_note = "") {
    const payload = await api(`/api/reports/${reportId}/action`, { method: "POST", body: { status, resolution_note } });
    await refreshState();
    return payload.report;
}

export async function saveProfile(body) {
    const payload = await api("/api/profile", { method: "POST", body });
    store.user = payload.user;
    emitChange();
    return payload.user;
}

export async function saveSettings(body) {
    const payload = await api("/api/settings", { method: "POST", body });
    store.user = payload.user;
    store.preferences = payload.preferences || store.preferences;
    emitChange();
    return payload.preferences;
}

export function applyTheme(theme = store.preferences?.theme || "system") {
    const root = document.documentElement;
    root.dataset.kailaTheme = theme;
    if (theme === "dark") {
        root.classList.add("kaila-theme-dark");
        root.classList.remove("kaila-theme-light");
    } else if (theme === "light") {
        root.classList.add("kaila-theme-light");
        root.classList.remove("kaila-theme-dark");
    } else {
        root.classList.remove("kaila-theme-light", "kaila-theme-dark");
    }
}

export async function saveProvider(body) {
    const payload = await api("/api/providers", {
        method: "POST",
        body: { ...body, rules_agreement: true },
    });
    await refreshState();
    return payload.provider;
}

export function selectProvider(id) {
    store.selectedProviderId = id ? Number(id) : null;
    store.providerProfileDetail = null;
    emitChange();
}

export async function loadProviderProfile(userId) {
    const payload = await api(`/api/providers/${userId}`);
    store.providerProfileDetail = payload;
    store.selectedProviderId = Number(userId);
    emitChange();
    return payload;
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
    await refreshState();
}

export async function deleteAccount(confirm) {
    await api("/api/account", {
        method: "DELETE",
        body: { confirm },
    });
    window.location.assign("/login");
}

export async function markNotificationsRead(ids = null) {
    const body = ids ? { ids: Array.isArray(ids) ? ids : [ids] } : {};
    const payload = await api("/api/notifications/read", { method: "POST", body });
    applyNotificationReadPatch(ids, payload.unreadNotifications);
    return payload;
}

function applyNotificationReadPatch(ids, unreadCount) {
    const markAll = ids === null;
    const idSet = markAll ? null : new Set((Array.isArray(ids) ? ids : [ids]).map(String));
    const now = new Date().toISOString();

    store.notifications = (store.notifications || []).map((item) => {
        if (markAll || idSet.has(String(item.id))) {
            return { ...item, read_at: item.read_at || now };
        }
        return item;
    });

    store.unreadNotifications = typeof unreadCount === "number"
        ? unreadCount
        : store.notifications.filter((item) => !item.read_at).length;
    emitChange();
}

export function notificationTarget(notification, role = store.user?.role) {
    const data = notification?.data && typeof notification.data === "object" ? notification.data : {};
    const requestId = notification?.service_request_id || data.requestId || null;
    const type = String(notification?.type || "");

    if (type === "report.opened") {
        if (role === "customer_service" || role === "admin") {
            return { view: "reports" };
        }
        return { view: "support" };
    }

    if (type === "offer.received") {
        return { view: "offers", requestId };
    }

    if (type === "job.posted") {
        return { view: role === "provider" ? "detail" : "requests", requestId };
    }

    if (type.startsWith("message.")) {
        return { view: "chat", requestId };
    }

    if (type.startsWith("job.") || type.includes("status") || type.includes("Payment")) {
        const view = role === "provider" ? "job-detail" : "detail";
        return { view: requestId ? view : (role === "provider" ? "jobs" : "requests"), requestId };
    }

    if (requestId) {
        return { view: role === "provider" ? "job-detail" : "detail", requestId };
    }

    return { view: "home" };
}

export async function markMessageThreadRead(scope, threadId) {
    const payload = await api("/api/message-read", {
        method: "POST",
        body: { scope, threadId },
    });

    if (typeof payload.unreadMessages === "number") {
        store.unreadMessages = payload.unreadMessages;
        store.badgeCounts = { ...store.badgeCounts, unreadMessages: payload.unreadMessages };
        emitChange();
    }

    return payload;
}

export function formatCountBadge(count = 0) {
    const value = Number(count) || 0;
    if (value <= 0) return "";
    return value > 99 ? "99+" : String(value);
}

export function navBadgeFor(viewId) {
    const counts = store.badgeCounts || {};
    const map = {
        inbox: store.unreadMessages,
        notifications: store.unreadNotifications,
        activity: store.unreadNotifications,
        requests: counts.requestsOpen ?? counts.matchingRequests,
        jobs: counts.activeJobs ?? counts.disputes,
        queue: counts.supportQueue,
        reports: counts.openReports,
        disputes: counts.supportDisputes ?? counts.disputes,
        validation: counts.validationEntries,
        offers: counts.pendingOffers ?? counts.offersSent,
    };

    return formatCountBadge(map[viewId]);
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
