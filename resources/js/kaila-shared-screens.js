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
import { avatar, card, escapeHtml, icon, sectionHead } from "./kaila-ui-core.js";

export function feedPostCard(post) {
    return card(`
        <div class="kaila-feed-post">
            <div class="kaila-feed-post__head">
                ${avatar(post.author?.name)}
                <div>
                    <strong>${escapeHtml(post.author?.name || "KAILA user")}</strong>
                    <div class="kaila-feed-post__meta">${timeAgo(post.created_at)}</div>
                </div>
            </div>
            <p class="kaila-feed-post__body">${escapeHtml(post.body || "")}</p>
            ${renderAttachments(post.media)}
            <div class="kaila-feed-post__actions">
                <button class="btn btn-link p-0" type="button" data-feed-like="${post.id}"><i class="fa-solid fa-thumbs-up"></i> ${post.reactions || 0}</button>
                <button class="btn btn-link p-0" type="button" data-feed-comment-toggle="${post.id}"><i class="fa-solid fa-comment"></i> ${post.comments || 0}</button>
            </div>
            <form class="kaila-feed-comment" data-feed-comment="${post.id}" hidden>
                <input class="kaila-input" name="body" placeholder="Write a comment" required>
                <button class="btn btn-primary" type="submit"><i class="fa-solid fa-paper-plane"></i></button>
            </form>
        </div>
    `);
}

export function feedScreen() {
    const posts = store.feedPosts || [];
    return `
        ${card(`
            <h2 style="margin:0 0 6px">Community Feed</h2>
            <p style="margin:0 0 14px;color:var(--kaila-muted)">Share updates, tips, and local service highlights.</p>
            <form data-feed-compose>
                <div class="kaila-field"><label>What's happening?</label><textarea class="kaila-textarea" name="body" required maxlength="1000" placeholder="Share something helpful with the KAILA community"></textarea></div>
                ${mediaUploadField("attachments")}
                <button class="btn btn-primary" type="submit"><i class="fa-solid fa-paper-plane"></i> Post update</button>
            </form>
        `)}
        <div style="height:14px"></div>
        ${posts.length ? posts.map(feedPostCard).join("") : card(`<p class="kaila-empty">No posts yet. Be the first to share.</p>`)}
    `;
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
