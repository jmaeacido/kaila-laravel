import {
    assistantChat,
    clearFeedFilter,
    deleteFeedPost,
    feedComment,
    feedFilterSummary,
    feedReaction,
    feedShare,
    getFeedFilter,
    isFeedCommentsExpanded,
    isStaffUser,
    loadFeed,
    markNotificationsRead,
    notificationTarget,
    patchFeedFilter,
    patchStore,
    reportUser,
    selectRequest,
    setFeedFilter,
    store,
    timeAgo,
    toggleFeedComments,
    updateFeedPost,
} from "./kaila-api.js";
import { mockPageHero } from "./kaila-mock-ui.js";
import { attachmentsFromForm, mediaUploadField, renderAttachments } from "./kaila-media.js";
import { avatar, card, escapeHtml, firstName, icon, kailaConfirm, kailaPrompt, sectionHead } from "./kaila-ui-core.js";
import { getActiveCall } from "./kaila-webrtc.js";

const FEED_STORIES = [
    { label: "Plumbing tips", icon: "fa-faucet-drip", keywords: ["plumb", "faucet", "pipe", "leak"] },
    { label: "Cleaning wins", icon: "fa-bucket", keywords: ["clean", "deep clean", "sanitize"] },
    { label: "Electrical help", icon: "fa-bolt", keywords: ["electrical", "outlet", "wire", "breaker"] },
    { label: "Provider spotlight", icon: "fa-award", keywords: ["provider", "verified", "top rated", "pro"] },
];

const FEED_TRENDS = [
    { label: "Leaking faucet repairs", meta: "Plumbing posts", keywords: ["faucet", "plumb", "leak", "drip"] },
    { label: "Move-out cleaning", meta: "Cleaning updates", keywords: ["clean", "move-out", "deep clean"] },
    { label: "Emergency electrical", meta: "Electrical help", keywords: ["electrical", "emergency", "outlet", "breaker"] },
];

const FEED_FEELINGS = ["happy", "thankful", "motivated", "busy", "excited"];

function feedSidebarShortcuts(role = store.user?.role) {
    if (role === "provider") {
        return [
            ["home", "fa-gauge-high", "Dashboard"],
            ["requests", "fa-magnifying-glass", "Matching Requests"],
            ["jobs", "fa-briefcase", "Active Jobs"],
            ["inbox", "fa-comment-dots", "Messages"],
            ["support", "fa-headset", "Support"],
        ];
    }
    if (role === "customer_service" || role === "admin" || role === "ops") {
        return [
            ["home", "fa-gauge-high", "Dashboard"],
            ["support", "fa-headset", "Support"],
            ["inbox", "fa-inbox", "Inbox"],
            ["activity", "fa-bell", "Activity"],
            ["settings", "fa-gear", "Settings"],
        ];
    }
    return [
        ["home", "fa-house", "Home"],
        ["providers", "fa-user-group", "Providers"],
        ["inbox", "fa-comment-dots", "Messages"],
        ["support", "fa-headset", "Support"],
    ];
}

function filteredFeedPosts() {
    let posts = [...(store.feedPosts || [])];
    const filter = store.feedFilter;
    if (!filter) {
        return posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const search = filter.search?.trim().toLowerCase();
    if (search) {
        posts = posts.filter((post) => {
            const haystack = `${post.body || ""} ${post.author?.name || ""} ${post.author?.role || ""}`.toLowerCase();
            return haystack.includes(search);
        });
    }

    if (filter.role && filter.role !== "all") {
        posts = posts.filter((post) => String(post.author?.role || post.role || "").toLowerCase() === filter.role);
    }

    if (filter.keywords?.length) {
        posts = posts.filter((post) => {
            const haystack = `${post.body || ""} ${post.author?.name || ""} ${post.author?.role || ""}`.toLowerCase();
            return filter.keywords.some((keyword) => haystack.includes(String(keyword).toLowerCase()));
        });
    }

    const sort = filter.sort || "newest";
    if (sort === "liked") {
        posts.sort((a, b) => (b.reactions || 0) - (a.reactions || 0));
    } else if (sort === "commented") {
        posts.sort((a, b) => (b.comments || 0) - (a.comments || 0));
    } else {
        posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return posts;
}

function renderFeedComments(post) {
    const comments = post.commentList || [];
    if (!comments.length) {
        return `<p class="social-comment-empty">No comments yet. Start the conversation.</p>`;
    }
    return comments.map((comment) => `
        <div class="social-comment-item">
            ${avatar(comment.author?.name || comment.author?.username || "Member", "small")}
            <div>
                <strong>${escapeHtml(comment.author?.name || comment.author?.username || "Member")}</strong>
                <p>${escapeHtml(comment.body || "")}</p>
                <small>${timeAgo(comment.created_at)}</small>
            </div>
        </div>
    `).join("");
}

export function feedPostCard(post) {
    const author = post.author?.name || post.author_name || "KAILA user";
    const role = post.author?.role || post.role || "Community member";
    const reactions = post.reactions || 0;
    const comments = post.comments || 0;
    const shares = post.shareCount || 0;
    const liked = (post.viewerReactions || []).includes("like");
    const isAuthor = Number(post.author_id) === Number(store.user?.id);
    const canModerate = isStaffUser();
    const expanded = isFeedCommentsExpanded(post.id);
    const menuId = `feed-menu-${post.id}`;

    return `
        <article class="social-post-card" data-feed-post="${post.id}">
            <header class="social-post-head">
                ${avatar(author, "", post.author?.social_photo_url || "")}
                <div class="social-post-head__meta">
                    <strong>${escapeHtml(author)}</strong>
                    <span>${escapeHtml(role)} · ${timeAgo(post.created_at)}</span>
                </div>
                <div class="social-post-menu-wrap">
                    <button class="social-icon-button social-icon-button--menu" type="button" aria-label="More options" data-feed-menu-toggle="${post.id}"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                    <div class="social-post-menu" id="${menuId}" data-feed-menu="${post.id}" hidden>
                        ${isAuthor ? `
                            <button type="button" data-feed-edit="${post.id}"><i class="fa-solid fa-pen"></i> Edit post</button>
                            <button type="button" class="is-danger" data-feed-delete="${post.id}"><i class="fa-solid fa-trash"></i> Delete post</button>
                        ` : ""}
                        ${canModerate && !isAuthor ? `<button type="button" class="is-danger" data-feed-delete="${post.id}"><i class="fa-solid fa-trash"></i> Remove post</button>` : ""}
                        ${!isAuthor ? `<button type="button" data-feed-report="${post.id}" data-feed-author="${post.author_id || ""}"><i class="fa-solid fa-flag"></i> Report post</button>` : ""}
                        <button type="button" data-feed-share="${post.id}"><i class="fa-solid fa-share-from-square"></i> Share post</button>
                    </div>
                </div>
            </header>
            <p class="social-post-body">${escapeHtml(post.body || "")}</p>
            ${renderAttachments(post.media)}
            <div class="social-post-stats">
                <button type="button" data-feed-like="${post.id}" class="${liked ? "is-active" : ""}"><i class="fa-solid fa-thumbs-up"></i> ${reactions} likes</button>
                <button type="button" data-feed-comment-toggle="${post.id}">${comments} comments</button>
                ${shares ? `<span><i class="fa-solid fa-share-from-square"></i> ${shares} shares</span>` : ""}
            </div>
            <div class="social-post-actions">
                <button type="button" data-feed-like="${post.id}" class="${liked ? "is-active" : ""}"><i class="fa-${liked ? "solid" : "regular"} fa-thumbs-up"></i> Like</button>
                <button type="button" data-feed-comment-toggle="${post.id}"><i class="fa-regular fa-comment"></i> Comment</button>
                <button type="button" data-feed-share="${post.id}"><i class="fa-regular fa-share-from-square"></i> Share</button>
            </div>
            <section class="social-post-comments ${expanded ? "" : "hidden"}" data-feed-comments-panel="${post.id}">
                <div class="social-comment-list">${renderFeedComments(post)}</div>
                <form class="social-comment-form" data-feed-comment="${post.id}">
                    ${avatar(store.user?.name || "You", "small", store.user?.social_photo_url || "")}
                    <input name="body" placeholder="Write a comment..." required>
                    <button type="submit" aria-label="Post comment"><i class="fa-solid fa-paper-plane"></i></button>
                </form>
            </section>
        </article>
    `;
}

export function feedScreen() {
    const posts = filteredFeedPosts();
    const allPosts = store.feedPosts || [];
    const userName = store.user?.name || "KAILA User";
    const role = store.user?.role || "client";
    const providers = (store.providers || []).slice(0, 3);
    const activeFilter = store.feedFilter;
    const filterState = getFeedFilter();
    const filterSummary = feedFilterSummary(filterState);
    const postCountLabel = activeFilter && posts.length !== allPosts.length
        ? `${posts.length} of ${allPosts.length} posts`
        : `${posts.length} post${posts.length === 1 ? "" : "s"}`;

    return `
        <div class="social-feed-shell">
            <aside class="social-feed-side social-feed-side--left">
                <section class="social-panel social-profile-panel">
                    ${avatar(userName, "large", store.user?.social_photo_url || "")}
                    <strong>${escapeHtml(userName)}</strong>
                    <span>${escapeHtml(role)} · ${escapeHtml(store.user?.area || "Your area")}</span>
                    <button class="btn btn-outline-primary btn-sm" type="button" data-view-link="settings">View profile</button>
                </section>
                <section class="social-panel">
                    <h3>Shortcuts</h3>
                    ${feedSidebarShortcuts(role).map(([view, fa, label]) => `
                        <button type="button" data-view-link="${view}"><i class="fa-solid ${fa}"></i> ${escapeHtml(label)}</button>
                    `).join("")}
                </section>
            </aside>

            <main class="social-feed-main">
                <div class="social-feed-title">
                    <div>
                        <h1>Community Feed</h1>
                        <p>See local service updates, tips, provider posts, and neighborhood activity.</p>
                        ${activeFilter ? `
                            <div class="social-feed-filter-chip">
                                <span><i class="fa-solid fa-filter"></i> ${escapeHtml(filterSummary)}</span>
                                <button type="button" data-feed-filter-clear>Clear</button>
                            </div>
                        ` : ""}
                    </div>
                    <button class="btn btn-primary" type="button" data-feed-focus><i class="fa-solid fa-plus"></i> Create post</button>
                </div>

                <section class="social-feed-toolbar" aria-label="Feed filters">
                    <label class="social-feed-toolbar__search">
                        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                        <input type="search" data-feed-search placeholder="Search posts, people, or topics..." value="${escapeHtml(filterState.search || "")}">
                    </label>
                    <div class="social-feed-toolbar__row">
                        <div class="social-feed-toolbar__group" role="group" aria-label="Filter by role">
                            <span>Audience</span>
                            <button type="button" class="${filterState.role === "all" ? "is-active" : ""}" data-feed-role="all">All</button>
                            <button type="button" class="${filterState.role === "client" ? "is-active" : ""}" data-feed-role="client">Clients</button>
                            <button type="button" class="${filterState.role === "provider" ? "is-active" : ""}" data-feed-role="provider">Providers</button>
                        </div>
                        <label class="social-feed-toolbar__sort">
                            <span>Sort</span>
                            <select data-feed-sort>
                                <option value="newest" ${filterState.sort === "newest" ? "selected" : ""}>Newest</option>
                                <option value="liked" ${filterState.sort === "liked" ? "selected" : ""}>Most liked</option>
                                <option value="commented" ${filterState.sort === "commented" ? "selected" : ""}>Most commented</option>
                            </select>
                        </label>
                        <span class="social-feed-toolbar__count">${postCountLabel}</span>
                    </div>
                </section>

                <section class="social-stories" aria-label="Stories">
                    ${FEED_STORIES.map((story) => `
                        <button class="social-story-card ${activeFilter?.topicLabel === story.label ? "is-active" : ""}" type="button"
                            data-feed-filter="${escapeHtml(story.label)}"
                            data-feed-keywords="${escapeHtml(story.keywords.join("|"))}">
                            <span><i class="fa-solid ${story.icon}"></i></span>
                            <strong>${escapeHtml(story.label)}</strong>
                        </button>
                    `).join("")}
                </section>

                <section class="social-composer-card" id="feed-composer">
                    <form data-feed-compose>
                        <div class="social-composer-top">
                            ${avatar(userName, "", store.user?.social_photo_url || "")}
                            <textarea name="body" required maxlength="1000" placeholder="What's on your mind, ${escapeHtml(firstName(userName))}?"></textarea>
                        </div>
                        <div class="social-upload-row">
                            ${mediaUploadField("attachments")}
                        </div>
                        <div class="social-feeling-picker" data-feed-feeling-picker hidden>
                            ${FEED_FEELINGS.map((feeling) => `
                                <button type="button" data-feed-feeling="${feeling}">${escapeHtml(feeling.charAt(0).toUpperCase() + feeling.slice(1))}</button>
                            `).join("")}
                        </div>
                        <div class="social-composer-actions">
                            <button type="button" data-feed-file><i class="fa-solid fa-image text-success"></i> Photo/video</button>
                            <button type="button" data-feed-feeling-open><i class="fa-regular fa-face-smile text-warning"></i> Feeling</button>
                            <button type="button" data-feed-checkin><i class="fa-solid fa-location-dot text-danger"></i> Check in</button>
                            <button class="btn btn-primary" type="submit"><i class="fa-solid fa-paper-plane"></i> Post</button>
                        </div>
                    </form>
                </section>

                <div class="social-post-list">
                    ${posts.length
                        ? posts.map(feedPostCard).join("")
                        : `<div class="social-feed-empty"><i class="fa-solid fa-users"></i><strong>${activeFilter ? "No posts match this filter." : "No posts yet."}</strong><p>${activeFilter ? "Try another story or clear the filter." : "Share a tip, update, or photo to start the conversation."}</p></div>`}
                </div>
            </main>

            <aside class="social-feed-side social-feed-side--right">
                <section class="social-panel">
                    <h3>Trending in KAILA</h3>
                    ${FEED_TRENDS.map((trend) => `
                        <button type="button" class="${activeFilter?.topicLabel === trend.label ? "is-active" : ""}"
                            data-feed-filter="${escapeHtml(trend.label)}"
                            data-feed-keywords="${escapeHtml(trend.keywords.join("|"))}">
                            <b>${escapeHtml(trend.label)}</b><span>${escapeHtml(trend.meta)}</span>
                        </button>
                    `).join("")}
                </section>
                <section class="social-panel">
                    <h3>Suggested providers</h3>
                    ${providers.length ? providers.map((provider) => `
                        <button type="button" data-view-link="${role === "provider" ? "requests" : "providers"}">
                            ${avatar(provider.display_name || provider.user?.name || "Provider", "small", provider.user?.social_photo_url || "")}
                            <span>${escapeHtml(provider.display_name || provider.user?.name || "Provider")}</span>
                        </button>
                    `).join("") : `
                        <button type="button" data-view-link="${role === "provider" ? "requests" : "providers"}">
                            <span>Browse providers in your area</span>
                        </button>
                    `}
                </section>
                <section class="social-panel social-safety-note">
                    <i class="fa-solid fa-shield-halved"></i>
                    <div>
                        <strong>Stay safe</strong>
                        <p>Keep payments and conversations inside KAILA whenever possible.</p>
                    </div>
                </section>
            </aside>
        </div>
    `;
}

export function marketplaceSupportScreen({
    composeAttr = "data-marketplace-support",
    activePanel = "chat",
    showDispute = false,
    showBlock = false,
    disputeFormHtml = "",
    blockFormHtml = "",
} = {}) {
    const messages = store.directMessages || [];
    const deskOnline = Boolean(store.supportDesk);
    const tabs = [
        ["chat", "Live chat", "fa-comments"],
        ...(showDispute ? [["dispute", "Report job", "fa-flag"]] : []),
        ...(showBlock ? [["block", "Block user", "fa-ban"]] : []),
    ];

    return `
        <section class="help-hub">
            <header class="help-hub__hero">
                <div class="help-hub__hero-copy">
                    <span class="help-hub__badge"><i class="fa-solid fa-headset"></i> Support</span>
                    <h1>Customer Support</h1>
                    <p>Chat with <strong>KAILA Customer Service</strong>, report a job, or ask Katabang for guided help.</p>
                </div>
                <div class="help-hub__desk-card">
                    <span class="help-hub__desk-avatar">CS</span>
                    <div>
                        <strong>KAILA Customer Service</strong>
                        <small>${deskOnline ? "Online · replies during support hours" : "Support desk unavailable"}</small>
                    </div>
                    <button class="btn btn-outline-primary btn-sm" type="button" data-view-link="assistant"><i class="fa-solid fa-wand-magic-sparkles"></i> Ask Katabang</button>
                </div>
            </header>

            <div class="help-hub__topics">
                ${helpTopicCard("fa-circle-question", "Account help", "Profile, logout, and settings", "assistant")}
                ${helpTopicCard("fa-briefcase", "Job issues", "Disputes, delays, and quality concerns", showDispute ? "dispute" : "support")}
                ${helpTopicCard("fa-shield-halved", "Safety", "Report unsafe behavior or block a user", showBlock ? "block" : "support")}
            </div>

            <div class="help-hub__layout">
                <aside class="help-hub__nav" aria-label="Support options">
                    ${tabs.map(([id, label, fa]) => `
                        <button class="help-hub__nav-item ${activePanel === id ? "is-active" : ""}" type="button" data-support-panel="${id}">
                            <i class="fa-solid ${fa}"></i><span>${escapeHtml(label)}</span>
                        </button>
                    `).join("")}
                    <div class="help-hub__nav-note">
                        <i class="fa-solid fa-lock"></i>
                        <p>Keep job payments and sensitive details inside KAILA whenever possible.</p>
                    </div>
                </aside>

                <div class="help-hub__panel">
                    <section class="help-hub__chat ${activePanel === "chat" ? "" : "hidden"}" data-support-section="chat">
                        <header class="help-hub__panel-head">
                            <div>
                                <strong>KAILA Customer Service</strong>
                                <span>We typically reply during business hours</span>
                            </div>
                        </header>
                        <div class="help-hub__messages" data-support-messages>
                            ${messages.map(supportMessageBubble).join("") || `<div class="help-hub__empty"><i class="fa-solid fa-message"></i><p>Start a conversation with KAILA Customer Service.</p></div>`}
                        </div>
                        <form class="help-hub__compose" ${composeAttr}>
                            <label class="help-hub__attach" aria-label="Attach file"><i class="fa-solid fa-paperclip"></i><input type="file" name="attachments" multiple hidden></label>
                            <input class="form-control" name="body" placeholder="Describe your issue..." required>
                            <button class="help-hub__send" type="submit" aria-label="Send"><i class="fa-solid fa-paper-plane"></i></button>
                        </form>
                    </section>

                    ${showDispute ? `<section class="help-hub__form-panel ${activePanel === "dispute" ? "" : "hidden"}" data-support-section="dispute">${disputeFormHtml}</section>` : ""}
                    ${showBlock ? `<section class="help-hub__form-panel ${activePanel === "block" ? "" : "hidden"}" data-support-section="block">${blockFormHtml}</section>` : ""}
                </div>
            </div>
        </section>`;
}

function helpTopicCard(fa, title, copy, panel) {
    const attr = panel === "assistant"
        ? `data-view-link="assistant"`
        : `data-support-panel="${panel}"`;
    return `
        <button class="help-hub__topic" type="button" ${attr}>
            <span><i class="fa-solid ${fa}"></i></span>
            <strong>${escapeHtml(title)}</strong>
            <small>${escapeHtml(copy)}</small>
        </button>`;
}

function supportMessageBubble(message) {
    const outgoing = message.sender_id === store.user?.id;
    return `<div class="help-hub__bubble ${outgoing ? "is-out" : "is-in"}">${escapeHtml(message.body || "")}${renderAttachments(message.attachments)}</div>`;
}

export function bindSupportHubActions({ navigate, toast }) {
    document.querySelectorAll("[data-support-panel]").forEach((button) => {
        button.addEventListener("click", () => {
            const panel = button.dataset.supportPanel;
            if (panel === "assistant") {
                navigate("assistant");
                return;
            }
            history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${panel}`);
            document.querySelectorAll("[data-support-panel]").forEach((el) => el.classList.toggle("is-active", el.dataset.supportPanel === panel));
            document.querySelectorAll("[data-support-section]").forEach((section) => {
                section.classList.toggle("hidden", section.dataset.supportSection !== panel);
            });
        });
    });

    const messagesHost = document.querySelector("[data-support-messages]");
    if (messagesHost) {
        messagesHost.scrollTop = messagesHost.scrollHeight;
    }
}

export function callScreen({ peerName = "Contact", peerPhoto = "", subtitle = "Secure KAILA call" } = {}) {
    const incoming = store.incomingCall;
    const session = store.callSession || {};
    const active = getActiveCall();
    const displayName = incoming?.senderName || session.peerName || peerName || "Contact";
    const withVideo = Boolean(incoming?.withVideo ?? session.withVideo ?? active?.withVideo);
    const isIncoming = Boolean(incoming);
    const isActive = Boolean(active);
    const connected = session.status === "connected" || Boolean(active?.remoteStream);
    const statusText = isIncoming
        ? `${withVideo ? "Video" : "Voice"} call`
        : connected
            ? "Connected"
            : session.status === "ringing"
                ? "Calling..."
                : session.status === "connecting"
                    ? "Connecting..."
                    : subtitle;

    return `
        <section class="kaila-call-shell" data-call-shell>
            <div class="kaila-call-stage ${connected ? "is-connected" : ""} ${withVideo ? "is-video" : "is-audio"}" data-call-stage>
                ${withVideo ? `
                    <video class="kaila-call-video kaila-call-video--remote" data-call-remote autoplay playsinline></video>
                    <video class="kaila-call-video kaila-call-video--local" data-call-local autoplay playsinline muted></video>
                ` : `
                    <div class="kaila-call-audio-card">
                        ${avatar(displayName, "large", peerPhoto)}
                    </div>
                `}
                <audio data-call-audio autoplay></audio>
            </div>
            <div class="kaila-call-meta">
                <strong>${escapeHtml(displayName)}</strong>
                <p>${escapeHtml(statusText)}</p>
            </div>
            <div class="kaila-call-controls">
                ${isIncoming ? `
                    <button class="kaila-call-control kaila-call-control--accept" type="button" data-accept-call aria-label="Accept call"><i class="fa-solid fa-phone"></i></button>
                    <button class="kaila-call-control kaila-call-control--reject" type="button" data-reject-call aria-label="Decline call"><i class="fa-solid fa-phone-slash"></i></button>
                ` : isActive ? `
                    ${withVideo ? `<button class="kaila-call-control" type="button" data-call-toggle-video aria-label="Toggle camera"><i class="fa-solid fa-video"></i></button>` : ""}
                    <button class="kaila-call-control" type="button" data-call-toggle-mic aria-label="Toggle microphone"><i class="fa-solid fa-microphone"></i></button>
                    <button class="kaila-call-control kaila-call-control--reject" type="button" data-hangup-call aria-label="End call"><i class="fa-solid fa-phone-slash"></i></button>
                ` : `<p class="kaila-call-idle">${escapeHtml(subtitle)}</p>`}
            </div>
        </section>`;
}

export function assistantScreen() {
    const messages = store.assistantMessages || [];
    const defaultSuggestions = [
        "How do I post a service request?",
        "How do I contact Customer Service?",
        "How do I log out?",
        "How do I report a problem?",
    ];
    const suggestions = store.assistantSuggestions?.length ? store.assistantSuggestions : defaultSuggestions;
    const userName = firstName(store.user?.name || "there");

    return `
        <section class="katabang-page">
            <header class="katabang-page__hero">
                <div class="katabang-page__hero-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
                <div>
                    <span class="katabang-page__eyebrow">AI Guide</span>
                    <h1>Katabang Assistant</h1>
                    <p>Hi ${escapeHtml(userName)}. Ask for tutorials, walkthroughs, and KAILA navigation help. For urgent staff action, use Customer Support chat.</p>
                </div>
            </header>

            <div class="katabang-page__layout">
                <aside class="katabang-page__aside">
                    <h2>Suggested questions</h2>
                    <div class="katabang-page__suggestions">
                        ${suggestions.map((item) => `<button class="katabang-page__suggestion" type="button" data-assistant-suggest="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join("")}
                    </div>
                    <div class="katabang-page__tip">
                        <i class="fa-solid fa-circle-info"></i>
                        <p>Logout and account settings are in the <strong>top-right profile menu</strong>, not the bottom-left.</p>
                    </div>
                    <button class="btn btn-outline-primary w-100" type="button" data-view-link="support"><i class="fa-solid fa-headset"></i> Open Customer Support</button>
                </aside>

                <div class="katabang-page__chat card">
                    <div class="katabang-page__messages" data-assistant-messages>
                        ${messages.length ? messages.map(assistantMessageBubble).join("") : `
                            <article class="katabang-page__welcome">
                                <strong>Katabang</strong>
                                <p>I can help with posting requests, offers, chat, reports, account settings, and logout.</p>
                            </article>`}
                    </div>
                    <form class="katabang-page__compose" data-assistant-chat>
                        <input class="form-control" name="prompt" placeholder="Ask Katabang anything about KAILA..." required maxlength="1000">
                        <button class="btn btn-primary" type="submit"><i class="fa-solid fa-paper-plane"></i> Send</button>
                    </form>
                </div>
            </div>
        </section>`;
}

function assistantMessageBubble(message) {
    const isUser = message.role === "user";
    return `
        <article class="katabang-page__bubble ${isUser ? "is-user" : "is-assistant"}">
            <strong>${isUser ? "You" : "Katabang"}</strong>
            <p>${escapeHtml(message.content || "")}</p>
        </article>`;
}

export function analyticsScreen() {
    const insight = store.analyticsInsight;
    return card(`
        ${sectionHead("Pilot Analytics", `<button class="btn btn-outline-primary btn-sm" type="button" data-refresh-analytics><i class="fa-solid fa-rotate"></i> Refresh</button>`)}
        ${insight ? `
            <p style="font-size:1rem;line-height:1.6">${escapeHtml(insight.summary || "No summary yet.")}</p>
            <div class="kaila-grid kaila-grid-2" style="margin-top:16px">
                <div><h3 style="margin:0 0 8px">Risks</h3><ul>${(insight.risks || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>None flagged.</li>"}</ul></div>
                <div><h3 style="margin:0 0 8px">Recommended actions</h3><ul>${(insight.actions || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>Continue monitoring.</li>"}</ul></div>
            </div>
        ` : `<p class="kaila-empty">Loading analytics insights...</p>`}
    `);
}

export function validationScreen() {
    return card(`
        ${sectionHead("Validation Survey")}
        <form data-validation-form>
            <div class="kaila-field"><label>Type</label><select class="kaila-select" name="type"><option value="client_survey">Client survey</option><option value="provider_interview">Provider interview</option></select></div>
            <div class="kaila-field"><label>Participant name</label><input class="kaila-input" name="participant" required></div>
            <div class="kaila-field"><label>Notes</label><textarea class="kaila-textarea" name="notes" required></textarea></div>
            <div class="kaila-field"><label>Satisfaction (1-5)</label><input class="kaila-input" name="score" type="number" min="1" max="5" value="4"></div>
            <button class="kaila-btn kaila-btn--primary" type="button" data-validation-signal>Get AI decision signal</button>
            <p data-validation-result style="margin:12px 0 0;color:var(--kaila-muted)"></p>
            <button class="kaila-btn kaila-btn--success kaila-btn--block" type="submit" style="margin-top:14px">Save validation entry</button>
        </form>
    `);
}

export function bindFeedActions({ toast }) {
    const closeFeedMenus = () => {
        document.querySelectorAll("[data-feed-menu]").forEach((menu) => {
            menu.hidden = true;
        });
    };

    const focusFeedComposer = () => {
        const composer = document.getElementById("feed-composer");
        const textarea = document.querySelector("[data-feed-compose] textarea");
        if (!composer || !textarea) return;
        composer.scrollIntoView({ behavior: "smooth", block: "center" });
        composer.classList.add("is-focused");
        window.setTimeout(() => {
            textarea.focus({ preventScroll: true });
            window.setTimeout(() => composer.classList.remove("is-focused"), 1200);
        }, 350);
    };

    document.querySelectorAll("[data-feed-focus]").forEach((button) => {
        button.addEventListener("click", focusFeedComposer);
    });

    document.querySelector("[data-feed-file]")?.addEventListener("click", () => {
        document.querySelector("[data-feed-compose] input[type='file']")?.click();
    });

    document.querySelector("[data-feed-feeling-open]")?.addEventListener("click", () => {
        document.querySelector("[data-feed-feeling-picker]")?.toggleAttribute("hidden");
    });

    document.querySelectorAll("[data-feed-feeling]").forEach((button) => {
        button.addEventListener("click", () => {
            const textarea = document.querySelector("[data-feed-compose] textarea");
            const picker = document.querySelector("[data-feed-feeling-picker]");
            if (!textarea) return;
            const feeling = button.dataset.feedFeeling;
            const prefix = `Feeling ${feeling} · `;
            textarea.value = textarea.value.startsWith(prefix) ? textarea.value : `${prefix}${textarea.value}`.trim();
            picker?.setAttribute("hidden", "");
            textarea.focus();
        });
    });

    document.querySelector("[data-feed-checkin]")?.addEventListener("click", () => {
        const textarea = document.querySelector("[data-feed-compose] textarea");
        if (!textarea) return;
        const area = store.user?.area || "my area";
        const prefix = `📍 Checked in at ${area} · `;
        textarea.value = textarea.value.startsWith(prefix) ? textarea.value : `${prefix}${textarea.value}`.trim();
        textarea.focus();
    });

    document.querySelector("[data-feed-filter-clear]")?.addEventListener("click", () => {
        clearFeedFilter();
    });

    let feedSearchTimer = null;
    document.querySelector("[data-feed-search]")?.addEventListener("input", (event) => {
        window.clearTimeout(feedSearchTimer);
        const value = event.target.value;
        feedSearchTimer = window.setTimeout(() => {
            patchFeedFilter({ search: value });
        }, 280);
    });

    document.querySelectorAll("[data-feed-role]").forEach((button) => {
        button.addEventListener("click", () => {
            patchFeedFilter({ role: button.dataset.feedRole || "all" });
        });
    });

    document.querySelector("[data-feed-sort]")?.addEventListener("change", (event) => {
        patchFeedFilter({ sort: event.target.value || "newest" });
    });

    document.querySelectorAll("[data-feed-filter]").forEach((button) => {
        button.addEventListener("click", () => {
            const label = button.dataset.feedFilter;
            const keywords = String(button.dataset.feedKeywords || "")
                .split("|")
                .map((item) => item.trim())
                .filter(Boolean);
            setFeedFilter(label, keywords);
        });
    });

    document.querySelector("[data-feed-compose]")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.target;
        try {
            const { createFeedPost } = await import("./kaila-api.js");
            const body = new FormData(form).get("body");
            const attachments = await attachmentsFromForm(form, "attachments");
            await createFeedPost(body, attachments);
            form.reset();
            document.querySelector("[data-feed-feeling-picker]")?.setAttribute("hidden", "");
            toast("Post published.");
        } catch (error) {
            toast(error.message);
        }
    });

    document.querySelectorAll("[data-feed-like]").forEach((button) => {
        button.addEventListener("click", async () => {
            try {
                const result = await feedReaction(button.dataset.feedLike, "like");
                toast(result.active === false ? "Like removed." : "Post liked.");
            } catch (error) {
                toast(error.message);
            }
        });
    });

    document.querySelectorAll("[data-feed-comment-toggle]").forEach((button) => {
        button.addEventListener("click", () => {
            toggleFeedComments(button.dataset.feedCommentToggle);
        });
    });

    document.querySelectorAll("[data-feed-comment]").forEach((form) => {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const postId = form.dataset.feedComment;
            try {
                store.feedExpandedComments = [...new Set([...(store.feedExpandedComments || []), String(postId)])];
                await feedComment(postId, new FormData(form).get("body"));
                form.reset();
                toast("Comment posted.");
            } catch (error) {
                toast(error.message);
            }
        });
    });

    document.querySelectorAll("[data-feed-share]").forEach((button) => {
        button.addEventListener("click", async () => {
            closeFeedMenus();
            const postId = button.dataset.feedShare;
            const shareUrl = `${window.location.origin}/feed`;
            try {
                await feedShare(postId);
                if (navigator.share) {
                    await navigator.share({
                        title: "KAILA Community Feed",
                        text: "Check out this post on KAILA.",
                        url: shareUrl,
                    });
                } else if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(shareUrl);
                    toast("Feed link copied.");
                } else {
                    toast("Post shared.");
                }
            } catch (error) {
                if (error?.name !== "AbortError") {
                    toast(error.message || "Could not share this post.");
                }
            }
        });
    });

    document.querySelectorAll("[data-feed-menu-toggle]").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            const menu = document.querySelector(`[data-feed-menu="${button.dataset.feedMenuToggle}"]`);
            if (!menu) return;
            const willOpen = menu.hidden;
            closeFeedMenus();
            menu.hidden = !willOpen;
        });
    });

    document.querySelectorAll("[data-feed-edit]").forEach((button) => {
        button.addEventListener("click", async () => {
            closeFeedMenus();
            const post = (store.feedPosts || []).find((item) => String(item.id) === String(button.dataset.feedEdit));
            const nextBody = await kailaPrompt({
                title: "Edit post",
                message: "Update what you shared with the community.",
                defaultValue: post?.body || "",
                multiline: true,
                confirmLabel: "Save changes",
            });
            if (nextBody === null || !nextBody.trim()) return;
            try {
                await updateFeedPost(button.dataset.feedEdit, { body: nextBody.trim() });
                toast("Post updated.");
            } catch (error) {
                toast(error.message);
            }
        });
    });

    document.querySelectorAll("[data-feed-delete]").forEach((button) => {
        button.addEventListener("click", async () => {
            closeFeedMenus();
            const confirmed = await kailaConfirm({
                title: "Delete post",
                message: "This post will be removed from the community feed.",
                confirmLabel: "Delete post",
                cancelLabel: "Keep post",
                tone: "danger",
            });
            if (!confirmed) return;
            try {
                await deleteFeedPost(button.dataset.feedDelete);
                toast("Post deleted.");
            } catch (error) {
                toast(error.message);
            }
        });
    });

    document.querySelectorAll("[data-feed-report]").forEach((button) => {
        button.addEventListener("click", async () => {
            closeFeedMenus();
            const authorId = button.dataset.feedAuthor;
            if (!authorId) return toast("Unable to report this post.");
            const details = await kailaPrompt({
                title: "Report post",
                message: "Tell us why this post should be reviewed.",
                defaultValue: "Inappropriate or misleading content",
                multiline: true,
                confirmLabel: "Submit report",
            });
            if (details === null) return;
            try {
                await reportUser(Number(authorId), "Inappropriate feed post", details);
                toast("Report submitted.");
            } catch (error) {
                toast(error.message);
            }
        });
    });

    document.querySelectorAll("[data-feed-menu]").forEach((menu) => {
        menu.addEventListener("click", (event) => event.stopPropagation());
    });

    if (!window.__kailaFeedMenuListener) {
        window.__kailaFeedMenuListener = true;
        document.addEventListener("click", closeFeedMenus);
    }
}

export function bindAssistantActions({ toast }) {
    const scrollAssistant = () => {
        const host = document.querySelector("[data-assistant-messages]");
        if (host) host.scrollTop = host.scrollHeight;
    };

    const submitPrompt = async (prompt) => {
        if (!prompt) return;
        patchStore({
            assistantMessages: [...(store.assistantMessages || []), { role: "user", content: prompt }],
        });
        scrollAssistant();
        try {
            const result = await assistantChat(store.assistantMessages);
            patchStore({
                assistantMessages: [...store.assistantMessages, { role: "assistant", content: result.answer }],
                assistantSuggestions: result.suggestions || [],
            });
            scrollAssistant();
            toast("Katabang replied.");
        } catch (error) {
            toast(error.message);
        }
    };

    document.querySelector("[data-assistant-chat]")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const prompt = new FormData(event.target).get("prompt");
        event.target.reset();
        await submitPrompt(prompt);
    });

    document.querySelectorAll("[data-assistant-suggest]").forEach((button) => {
        button.addEventListener("click", () => submitPrompt(button.dataset.assistantSuggest));
    });
}

export function bindStaffActions({ toast }) {
    document.querySelector("[data-refresh-analytics]")?.addEventListener("click", async () => {
        try {
            const { loadAnalytics } = await import("./kaila-api.js");
            await loadAnalytics();
            toast("Analytics refreshed.");
        } catch (error) {
            toast(error.message);
        }
    });

    document.querySelector("[data-validation-signal]")?.addEventListener("click", async () => {
        const form = document.querySelector("[data-validation-form]");
        if (!form) return;
        const data = Object.fromEntries(new FormData(form));
        try {
            const { validationDecisionSignal } = await import("./kaila-api.js");
            const result = await validationDecisionSignal({
                type: data.type,
                responses: {
                    participant: data.participant,
                    notes: data.notes,
                    score: Number(data.score),
                },
            });
            form.querySelector("[data-validation-result]").textContent = `${result.decisionSignal}: ${result.reason}`;
        } catch (error) {
            toast(error.message);
        }
    });

    document.querySelector("[data-validation-form]")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.target));
        try {
            const { saveValidationEntry } = await import("./kaila-api.js");
            await saveValidationEntry({
                type: data.type,
                responses: {
                    participant: data.participant,
                    notes: data.notes,
                    score: Number(data.score),
                },
                decision_signal: event.target.querySelector("[data-validation-result]")?.textContent?.split(":")[0] || "Neutral",
            });
            toast("Validation entry saved.");
            event.target.reset();
        } catch (error) {
            toast(error.message);
        }
    });
}

export function notificationActivityRow(item) {
    const unread = !item.read_at;
    const target = notificationTarget(item);

    return `
        <button class="notification-activity-row ${unread ? "is-unread" : ""}" type="button"
            data-open-notification="${item.id}"
            data-notification-view="${target.view}"
            ${target.requestId ? `data-notification-request="${target.requestId}"` : ""}>
            <span class="notification-activity-row__icon"><i class="fa-solid fa-bell"></i></span>
            <span class="notification-activity-row__body">
                <strong>${escapeHtml(item.title || item.type)}</strong>
                <small>${escapeHtml(item.body || "")} · ${timeAgo(item.created_at)}</small>
            </span>
            ${unread ? `<span class="notification-activity-row__status">New</span>` : ""}
            <i class="fa-solid fa-chevron-right notification-activity-row__chev"></i>
        </button>`;
}

export function activityScreen({ title = "Activity", subtitle = "Recent marketplace activity." } = {}) {
    const items = store.notifications || [];
    const hasUnread = (store.unreadNotifications || 0) > 0;

    return `
        ${mockPageHero(title, subtitle)}
        ${card(`
            ${sectionHead("Recent Activity", hasUnread ? `<button class="btn btn-outline-primary btn-sm" type="button" data-mark-notifications>Mark all as read</button>` : "")}
            <div class="notification-activity-list">
                ${items.length ? items.map(notificationActivityRow).join("") : `<p class="mock-empty">No notifications yet.</p>`}
            </div>
        `)}`;
}

export function bindNotificationActions({ navigate, toast, selectRequestAction = selectRequest } = {}) {
    document.querySelector("[data-mark-notifications]")?.addEventListener("click", async () => {
        try {
            await markNotificationsRead();
            toast?.("All notifications marked as read.");
        } catch (error) {
            toast?.(error.message);
        }
    });

    document.querySelectorAll("[data-open-notification]").forEach((button) => {
        button.addEventListener("click", async () => {
            const notificationId = Number(button.dataset.openNotification);
            const view = button.dataset.notificationView;
            const requestId = button.dataset.notificationRequest;

            try {
                await markNotificationsRead([notificationId]);
                if (requestId) {
                    selectRequestAction?.(requestId);
                }
                if (view) {
                    navigate?.(view);
                }
            } catch (error) {
                toast?.(error.message);
            }
        });
    });
}
