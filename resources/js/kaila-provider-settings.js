import { applyTheme, formatCountBadge, saveSettings, store } from "./kaila-api.js";
import { avatar, escapeHtml } from "./kaila-ui-core.js";

function settingsRow({ iconName, tone = "blue", label, value = "", sub = "", view = "", danger = false, badge = "", action = "" }) {
    const actionAttr = action || (view ? `data-view-link="${view}"` : `data-toast="${escapeHtml(label)} settings are coming soon."`);
    return `
        <button class="settings-list-row ${danger ? "settings-list-row--danger" : ""}" type="button" ${actionAttr}>
            <span class="settings-list-row__icon settings-list-row__icon--${tone}"><i class="fa-solid ${iconName}"></i></span>
            <span class="settings-list-row__body">
                <strong>${escapeHtml(label)}</strong>
                ${sub ? `<small>${escapeHtml(sub)}</small>` : ""}
            </span>
            ${value ? `<em>${escapeHtml(value)}</em>` : ""}
            ${badge ? `<b>${escapeHtml(badge)}</b>` : ""}
            <i class="fa-solid fa-chevron-right settings-list-row__chev"></i>
        </button>`;
}

function settingsToggleRow({ iconName, tone, label, checked = true, key = "" }) {
    return `
        <button class="settings-list-row" type="button" data-settings-toggle="${key}">
            <span class="settings-list-row__icon settings-list-row__icon--${tone}"><i class="fa-solid ${iconName}"></i></span>
            <span class="settings-list-row__body"><strong>${escapeHtml(label)}</strong></span>
            <span class="settings-switch ${checked ? "is-on" : ""}" aria-hidden="true"><i></i></span>
            <em>${checked ? "On" : "Off"}</em>
            <i class="fa-solid fa-chevron-right settings-list-row__chev"></i>
        </button>`;
}

function settingsSection(title, rows) {
    return `
        <section class="settings-section-card">
            <h2>${escapeHtml(title)}</h2>
            <div class="settings-list">${rows.join("")}</div>
        </section>`;
}

function themePreviewTiles(current = "system") {
    const themes = [
        { id: "system", label: "System", preview: "system" },
        { id: "light", label: "Light", preview: "light" },
        { id: "dark", label: "Dark", preview: "dark" },
    ];
    return `
        <div class="settings-theme-preview">
            ${themes.map((theme) => `
                <button
                    class="settings-theme-tile ${current === theme.id ? "is-active" : ""}"
                    type="button"
                    data-theme-choice="${theme.id}"
                    aria-pressed="${current === theme.id}"
                >
                    <span class="settings-theme-tile__mock settings-theme-tile__mock--${theme.preview}"></span>
                    <strong>${theme.label}</strong>
                    ${current === theme.id ? `<i class="fa-solid fa-circle-check"></i>` : ""}
                </button>
            `).join("")}
        </div>`;
}

function themeLabel(theme = "system") {
    return theme.charAt(0).toUpperCase() + theme.slice(1);
}

export function providerSettingsScreen() {
    const user = store.user || {};
    const profile = user.provider_profile || {};
    const stats = store.metrics?.provider || {};
    const prefs = store.preferences || {};
    const blockedCount = formatCountBadge(store.badgeCounts?.blockedUsers) || "0";
    const displayName = profile.display_name || user.name || "Provider";
    const rating = stats.averageRating ? `${stats.averageRating} (${stats.reviewCount || 0} reviews)` : "No ratings yet";

    return `
        <section class="client-settings-page provider-settings-page">
            <div class="settings-page-head settings-page-head--actions">
                <div>
                    <h1>Settings</h1>
                    <p>Manage your account, preferences, and app settings.</p>
                </div>
                <button class="btn btn-outline-primary" type="button" data-view-link="profile-preview">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> View Public Profile
                </button>
            </div>

            <section class="settings-profile-card">
                <div class="settings-profile-card__avatar">
                    ${avatar(displayName, "large", user.social_photo_url || "")}
                </div>
                <div class="settings-profile-card__body">
                    <h2>${escapeHtml(displayName)}</h2>
                    <p>${escapeHtml(profile.category || profile.tagline || "Service Provider")}</p>
                    <small>${escapeHtml(rating)}</small>
                    ${profile.trust_level ? `<span class="pp-badge pp-badge--verified settings-profile-card__verified"><i class="fa-solid fa-circle-check"></i> Verified Provider</span>` : ""}
                    <button class="settings-profile-card__link" type="button" data-view-link="profile">View & edit provider profile <i class="fa-solid fa-chevron-right"></i></button>
                </div>
            </section>

            <div class="settings-grid">
                <div class="settings-column">
                    ${settingsSection("Work Profile", [
                        settingsRow({ iconName: "fa-briefcase", tone: "blue", label: "Work Information", sub: "Services, experience, skills", view: "profile-edit" }),
                        settingsRow({ iconName: "fa-location-dot", tone: "green", label: "Service Area", sub: escapeHtml(profile.area || user.area || "Set your service area"), view: "profile-edit" }),
                        settingsRow({ iconName: "fa-clock", tone: "purple", label: "Availability", sub: "Set your working hours", view: "profile-edit" }),
                        settingsRow({ iconName: "fa-wallet", tone: "orange", label: "Earnings Settings", sub: "Payout method, bank details", view: "support" }),
                    ])}

                    ${settingsSection("Preferences", [
                        `<div class="settings-theme-block">
                            <p class="settings-theme-block__label">Theme Preview</p>
                            ${themePreviewTiles(prefs.theme || "system")}
                        </div>`,
                    ])}
                </div>

                <div class="settings-column">
                    ${settingsSection("Account Settings", [
                        settingsRow({ iconName: "fa-user", tone: "blue", label: "Account & Personal Information", sub: "Name, email, date of birth", view: "profile-edit" }),
                        settingsRow({ iconName: "fa-phone", tone: "green", label: "Contact Information", sub: user.contact_number || "Mobile number, alternate contact", view: "profile-edit" }),
                        settingsToggleRow({ iconName: "fa-bell", tone: "blue", label: "Push Notifications", checked: prefs.push_notifications !== false, key: "push_notifications" }),
                        settingsRow({ iconName: "fa-moon", tone: "purple", label: "Theme", value: themeLabel(prefs.theme || "system") }),
                        settingsRow({ iconName: "fa-ban", tone: "red", label: "Blocked Users", badge: blockedCount, view: "support" }),
                    ])}

                    ${settingsSection("Support & Policies", [
                        settingsRow({ iconName: "fa-shield-halved", tone: "blue", label: "Privacy Policy", view: "support" }),
                        settingsRow({ iconName: "fa-file-lines", tone: "green", label: "Terms of Service", view: "support" }),
                        settingsRow({ iconName: "fa-headset", tone: "purple", label: "Contact Support", view: "support" }),
                        settingsRow({ iconName: "fa-circle-question", tone: "orange", label: "Help Center", view: "support" }),
                    ])}
                </div>
            </div>

            <section class="settings-danger-card settings-danger-card--wide">
                <div>
                    <h2>Danger Zone</h2>
                    <p><i class="fa-solid fa-trash-can"></i> Delete Account — Permanently delete your account and all data. This action cannot be undone.</p>
                </div>
                <button class="btn btn-outline-danger" type="button" data-view-link="delete">Delete Account</button>
            </section>
        </section>`;
}

export function bindProviderSettingsActions({ toast }) {
    document.querySelectorAll("[data-theme-choice]").forEach((button) => {
        button.addEventListener("click", async () => {
            const theme = button.dataset.themeChoice;
            try {
                await saveSettings({ theme });
                applyTheme(theme);
                toast(`Theme set to ${themeLabel(theme)}.`);
            } catch (error) {
                toast(error.message);
            }
        });
    });

    document.querySelectorAll("[data-settings-toggle]").forEach((button) => {
        button.addEventListener("click", async () => {
            const key = button.dataset.settingsToggle;
            const current = store.preferences?.[key] !== false;
            try {
                await saveSettings({ [key]: !current });
                toast(`${key === "push_notifications" ? "Push notifications" : "Setting"} ${!current ? "enabled" : "disabled"}.`);
            } catch (error) {
                toast(error.message);
            }
        });
    });
}
