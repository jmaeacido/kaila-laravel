import {
    assistantChat,
    feedComment,
    feedReaction,
    loadFeed,
    patchStore,
    store,
    timeAgo,
} from "./kaila-api.js";
import { attachmentsFromForm, mediaUploadField, renderAttachments } from "./kaila-media.js";
import { avatar, card, escapeHtml, firstName, icon, sectionHead } from "./kaila-ui-core.js";

export function feedPostCard(post) {
    const author = post.author?.name || post.author_name || "KAILA user";
    const role = post.author?.role || post.role || "Community member";
    const reactions = Array.isArray(post.reactions) ? post.reactions.length : (post.reactions || post.reactions_count || 0);
    const comments = Array.isArray(post.comments) ? post.comments.length : (post.comments || post.comments_count || 0);
    return `
        <article class="social-post-card">
            <header class="social-post-head">
                ${avatar(author, "", post.author?.social_photo_url || "")}
                <div>
                    <strong>${escapeHtml(author)}</strong>
                    <span>${escapeHtml(role)} · ${timeAgo(post.created_at)}</span>
                </div>
                <button class="social-icon-button" type="button" aria-label="More options"><i class="fa-solid fa-ellipsis"></i></button>
            </header>
            <p class="social-post-body">${escapeHtml(post.body || "")}</p>
            ${renderAttachments(post.media)}
            <div class="social-post-stats">
                <span><i class="fa-solid fa-thumbs-up"></i> ${reactions} likes</span>
                <button type="button" data-feed-comment-toggle="${post.id}">${comments} comments</button>
            </div>
            <div class="social-post-actions">
                <button type="button" data-feed-like="${post.id}"><i class="fa-regular fa-thumbs-up"></i> Like</button>
                <button type="button" data-feed-comment-toggle="${post.id}"><i class="fa-regular fa-comment"></i> Comment</button>
                <button type="button" data-toast="Sharing is coming soon."><i class="fa-regular fa-share-from-square"></i> Share</button>
            </div>
            <form class="social-comment-form" data-feed-comment="${post.id}" hidden>
                ${avatar(store.user?.name || "You", "small", store.user?.social_photo_url || "")}
                <input name="body" placeholder="Write a comment..." required>
                <button type="submit" aria-label="Post comment"><i class="fa-solid fa-paper-plane"></i></button>
            </form>
        </article>
    `;
}

export function feedScreen() {
    const posts = (store.feedPosts || []).length ? store.feedPosts : demoFeedPosts();
    const userName = store.user?.name || "Alex D.";
    return `
        <div class="social-feed-shell">
            <aside class="social-feed-side social-feed-side--left">
                <section class="social-panel social-profile-panel">
                    ${avatar(userName, "large", store.user?.social_photo_url || "")}
                    <strong>${escapeHtml(userName)}</strong>
                    <span>${escapeHtml(store.user?.role || "Client")} · ${escapeHtml(store.user?.area || "Makati City")}</span>
                    <button class="btn btn-outline-primary btn-sm" type="button" data-view-link="settings">View profile</button>
                </section>
                <section class="social-panel">
                    <h3>Shortcuts</h3>
                    <button type="button" data-view-link="home"><i class="fa-solid fa-house"></i> Home</button>
                    <button type="button" data-view-link="providers"><i class="fa-solid fa-user-group"></i> Providers</button>
                    <button type="button" data-view-link="inbox"><i class="fa-solid fa-comment-dots"></i> Messages</button>
                    <button type="button" data-view-link="support"><i class="fa-solid fa-headset"></i> Support</button>
                </section>
            </aside>

            <main class="social-feed-main">
                <div class="social-feed-title">
                    <div>
                        <h1>Community Feed</h1>
                        <p>See local service updates, tips, provider posts, and neighborhood activity.</p>
                    </div>
                    <button class="btn btn-primary" type="button" data-feed-focus><i class="fa-solid fa-plus"></i> Create post</button>
                </div>

                <section class="social-stories" aria-label="Stories">
                    ${["Plumbing tips", "Cleaning wins", "Electrical help", "Provider spotlight"].map((item, index) => `
                        <button class="social-story-card" type="button" data-toast="${escapeHtml(item)} stories are coming soon.">
                            <span><i class="fa-solid ${["fa-faucet-drip", "fa-bucket", "fa-bolt", "fa-award"][index]}"></i></span>
                            <strong>${escapeHtml(item)}</strong>
                        </button>
                    `).join("")}
                </section>

                <section class="social-composer-card">
                    <form data-feed-compose>
                        <div class="social-composer-top">
                            ${avatar(userName, "", store.user?.social_photo_url || "")}
                            <textarea name="body" required maxlength="1000" placeholder="What's on your mind, ${escapeHtml(firstName(userName))}?"></textarea>
                        </div>
                        <div class="social-upload-row">
                            ${mediaUploadField("attachments")}
                        </div>
                        <div class="social-composer-actions">
                            <button type="button" data-feed-file><i class="fa-solid fa-image text-success"></i> Photo/video</button>
                            <button type="button" data-toast="Feeling/activity is coming soon."><i class="fa-regular fa-face-smile text-warning"></i> Feeling</button>
                            <button type="button" data-toast="Check-in is coming soon."><i class="fa-solid fa-location-dot text-danger"></i> Check in</button>
                            <button class="btn btn-primary" type="submit"><i class="fa-solid fa-paper-plane"></i> Post</button>
                        </div>
                    </form>
                </section>

                <div class="social-post-list">
                    ${posts.map(feedPostCard).join("")}
                </div>
            </main>

            <aside class="social-feed-side social-feed-side--right">
                <section class="social-panel">
                    <h3>Trending in KAILA</h3>
                    <button type="button" data-toast="Opening trend soon."><b>Leaking faucet repairs</b><span>42 posts today</span></button>
                    <button type="button" data-toast="Opening trend soon."><b>Move-out cleaning</b><span>18 provider updates</span></button>
                    <button type="button" data-toast="Opening trend soon."><b>Emergency electrical</b><span>Popular in Makati</span></button>
                </section>
                <section class="social-panel">
                    <h3>Suggested providers</h3>
                    ${["Makati Plumbing Pros", "BrightWire Electric", "FreshNest Cleaning"].map((name) => `
                        <button type="button" data-view-link="providers">
                            ${avatar(name, "small")}
                            <span>${escapeHtml(name)}</span>
                        </button>
                    `).join("")}
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

function demoFeedPosts() {
    const now = Date.now();
    return [
        {
            id: "demo-feed-1",
            author: { name: "Makati Plumbing Pros", role: "Verified provider" },
            body: "Quick tip: if your faucet keeps dripping after closing the handle, the cartridge or washer may need replacement. Post a clear photo so providers can quote faster.",
            reactions: 24,
            comments: 8,
            created_at: new Date(now - 28 * 60 * 1000).toISOString(),
            media: [],
        },
        {
            id: "demo-feed-2",
            author: { name: "Alex D.", role: "Client" },
            body: "Booked a deep cleaning provider through KAILA today. Comparing offers made it easier to choose based on schedule and reviews.",
            reactions: 18,
            comments: 4,
            created_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
            media: [],
        },
        {
            id: "demo-feed-3",
            author: { name: "BrightWire Electric", role: "Top rated provider" },
            body: "Reminder: avoid overloading extension cords during rainy season. If breakers trip repeatedly, have the outlet checked before using it again.",
            reactions: 37,
            comments: 11,
            created_at: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
            media: [],
        },
    ];
}

export function assistantScreen() {
    const messages = store.assistantMessages || [];
    return card(`
        <div class="kaila-assistant">
            <div class="kaila-assistant__hero">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                <div>
                    <h2 style="margin:0">Katabang Assistant</h2>
                    <p style="margin:4px 0 0;color:var(--kaila-muted)">Ask about posting requests, offers, safety, or pilot workflows.</p>
                </div>
            </div>
            <div class="kaila-chat__messages kaila-assistant__messages">
                ${messages.map((message) => `<div class="kaila-bubble ${message.role === "user" ? "kaila-bubble--out" : "kaila-bubble--in"}">${escapeHtml(message.content)}</div>`).join("") || `<p class="kaila-empty">Ask Katabang anything about using KAILA.</p>`}
            </div>
            <form data-assistant-chat style="display:flex;gap:8px;margin-top:12px">
                <input class="kaila-input" name="prompt" placeholder="Ask Katabang..." required>
                <button class="btn btn-primary" type="submit"><i class="fa-solid fa-paper-plane"></i></button>
            </form>
            ${store.assistantSuggestions?.length ? `<div class="kaila-chip-row">${store.assistantSuggestions.map((item) => `<button class="kaila-chip" type="button" data-assistant-suggest="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join("")}</div>` : ""}
        </div>
    `);
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
    document.querySelector("[data-feed-focus]")?.addEventListener("click", () => {
        document.querySelector("[data-feed-compose] textarea")?.focus();
    });

    document.querySelector("[data-feed-file]")?.addEventListener("click", () => {
        document.querySelector("[data-feed-compose] input[type='file']")?.click();
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
            toast("Post published.");
        } catch (error) {
            toast(error.message);
        }
    });

    document.querySelectorAll("[data-feed-like]").forEach((button) => {
        button.addEventListener("click", async () => {
            if (String(button.dataset.feedLike).startsWith("demo-")) {
                toast("Demo reaction saved.");
                return;
            }
            try {
                await feedReaction(button.dataset.feedLike, "like");
                await loadFeed();
                toast("Reaction saved.");
            } catch (error) {
                toast(error.message);
            }
        });
    });

    document.querySelectorAll("[data-feed-comment-toggle]").forEach((button) => {
        button.addEventListener("click", () => {
            document.querySelector(`[data-feed-comment="${button.dataset.feedCommentToggle}"]`)?.toggleAttribute("hidden");
        });
    });

    document.querySelectorAll("[data-feed-comment]").forEach((form) => {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (String(form.dataset.feedComment).startsWith("demo-")) {
                form.reset();
                toast("Demo comment posted.");
                return;
            }
            try {
                await feedComment(form.dataset.feedComment, new FormData(form).get("body"));
                form.reset();
                await loadFeed();
                toast("Comment posted.");
            } catch (error) {
                toast(error.message);
            }
        });
    });
}

export function bindAssistantActions({ toast }) {
    const submitPrompt = async (prompt) => {
        if (!prompt) return;
        patchStore({
            assistantMessages: [...(store.assistantMessages || []), { role: "user", content: prompt }],
        });
        try {
            const result = await assistantChat(store.assistantMessages);
            patchStore({
                assistantMessages: [...store.assistantMessages, { role: "assistant", content: result.answer }],
                assistantSuggestions: result.suggestions || [],
            });
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
