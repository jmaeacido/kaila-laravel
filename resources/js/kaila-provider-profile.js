import { saveProvider, store } from "./kaila-api.js";
import { avatar, escapeHtml, pill } from "./kaila-ui-core.js";

function splitList(value = "") {
    return String(value || "")
        .split(/[\n,|]+/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function renderStars(score = 0) {
    const rounded = Math.round(Number(score) || 0);
    return Array.from({ length: 5 }, (_, index) => `
        <i class="fa-${index < rounded ? "solid" : "regular"} fa-star"></i>
    `).join("");
}

function profilePayloadFromStore() {
    const user = store.user || {};
    const profile = user.provider_profile || {};
    const stats = store.metrics?.provider || {};

    return {
        user: {
            id: user.id,
            name: user.name,
            area: user.area,
            social_photo_url: user.social_photo_url,
            memberSince: user.created_at
                ? new Date(user.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })
                : "",
        },
        profile,
        stats: {
            completedJobs: stats.completedJobs || 0,
            averageRating: stats.averageRating,
            reviewCount: stats.reviewCount || 0,
            responseRate: stats.completedJobs ? 98 : null,
            providerLevel: stats.averageRating >= 4.7 ? "Top Rated Provider" : "Trusted Provider",
            recommendRate: stats.reviewCount ? 96 : null,
        },
        reviews: store.providerProfileDetail?.reviews || [],
        ratingBreakdown: store.providerProfileDetail?.ratingBreakdown || {},
    };
}

function panelHead(icon, title, action = "") {
    return `
        <div class="pp-panel__head">
            <span class="pp-panel__icon"><i class="fa-solid ${icon}"></i></span>
            <h2>${escapeHtml(title)}</h2>
            ${action}
        </div>`;
}

function ownerSummary(data) {
    const user = data.user || {};
    const profile = data.profile || {};
    const stats = data.stats || {};
    const displayName = profile.display_name || user.name || "Provider";
    const tagline = profile.tagline || `${profile.category || "Service"} Specialist`;

    return `
        <section class="pp-summary">
            <div class="pp-summary__identity">
                <div class="pp-summary__avatar">
                    ${avatar(displayName, "large", user.social_photo_url || "")}
                    <button class="pp-summary__camera" type="button" data-view-link="profile-edit" aria-label="Change photo">
                        <i class="fa-solid fa-camera"></i>
                    </button>
                </div>
                <div class="pp-summary__meta">
                    <div class="pp-summary__title">
                        <h2>${escapeHtml(displayName)}</h2>
                        ${profile.trust_level ? `<span class="pp-badge pp-badge--verified"><i class="fa-solid fa-circle-check"></i> Verified</span>` : ""}
                    </div>
                    <p class="pp-summary__tagline">${escapeHtml(tagline)}</p>
                    <div class="pp-summary__chips">
                        ${pill(profile.status === "Inactive" ? "Inactive" : "Active · Visible to clients", profile.status === "Inactive" ? "gray" : "green")}
                        <span class="pp-badge"><i class="fa-solid fa-shield-halved"></i> ${escapeHtml(stats.providerLevel || "Trusted Provider")}</span>
                        ${user.memberSince ? `<span class="pp-badge pp-badge--muted"><i class="fa-regular fa-calendar"></i> Member since ${escapeHtml(user.memberSince)}</span>` : ""}
                    </div>
                </div>
            </div>
            <div class="pp-summary__stats">
                <article>
                    <span class="pp-stat-icon pp-stat-icon--green"><i class="fa-solid fa-clipboard-check"></i></span>
                    <strong>${stats.completedJobs || 0}</strong>
                    <small>Completed Jobs</small>
                </article>
                <article>
                    <span class="pp-stat-icon pp-stat-icon--yellow"><i class="fa-solid fa-star"></i></span>
                    <strong>${stats.averageRating ? `${stats.averageRating} <em>${renderStars(stats.averageRating)}</em>` : "—"}</strong>
                    <small>${stats.reviewCount ? `(${stats.reviewCount} reviews)` : "Average Rating"}</small>
                </article>
                <article>
                    <span class="pp-stat-icon pp-stat-icon--blue"><i class="fa-solid fa-user-check"></i></span>
                    <strong>${stats.responseRate ? `${stats.responseRate}%` : "—"}</strong>
                    <small>Response Rate</small>
                </article>
                <article>
                    <span class="pp-stat-icon pp-stat-icon--purple"><i class="fa-solid fa-medal"></i></span>
                    <strong>${stats.averageRating >= 4.7 ? "Top Rated" : "Provider"}</strong>
                    <small>Provider Level</small>
                </article>
            </div>
        </section>`;
}

function serviceTags(profile = {}, limit = 4) {
    const categories = splitList(profile.skills || profile.category || "");
    if (profile.category && !categories.includes(profile.category)) categories.unshift(profile.category);
    const visible = categories.slice(0, limit);
    const extra = categories.length - visible.length;
    return `
        <div class="pp-tags">
            ${visible.map((item) => `<span class="pp-tag">${escapeHtml(item)}</span>`).join("")}
            ${extra > 0 ? `<span class="pp-tag pp-tag--more">+${extra}</span>` : ""}
        </div>`;
}

function serviceList(profile = {}, limit = 5) {
    const items = splitList(profile.specific_services);
    const visible = items.slice(0, limit);
    const extra = items.length - visible.length;
    if (!visible.length) return `<p class="pp-empty">No services listed yet.</p>`;
    return `
        <ul class="pp-checklist">
            ${visible.map((item) => `<li><i class="fa-solid fa-check"></i> ${escapeHtml(item)}</li>`).join("")}
            ${extra > 0 ? `<li class="pp-checklist__more"><button type="button" data-view-link="profile-edit">+${extra} more</button></li>` : ""}
        </ul>`;
}

function pricingStrip(profile = {}) {
    const items = [
        { icon: "fa-peso-sign", tone: "green", label: "Minimum Fee", value: profile.minimum_fee || "—", field: "minimum_fee" },
        { icon: "fa-tags", tone: "purple", label: "Price Range", value: profile.price_range || "—", field: "price_range" },
        { icon: "fa-van-shuttle", tone: "blue", label: "Travel Limit", value: profile.travel_limit || "—", field: "travel_limit" },
        { icon: "fa-comments", tone: "orange", label: "Response Time", value: profile.response_time || "—", field: "response_time" },
    ];
    return `
        <div class="pp-pricing">
            ${items.map((item) => `
                <article class="pp-pricing__item">
                    <span class="pp-pricing__icon pp-pricing__icon--${item.tone}"><i class="fa-solid ${item.icon}"></i></span>
                    <div>
                        <small>${escapeHtml(item.label)}</small>
                        <strong>${escapeHtml(item.value)}</strong>
                    </div>
                    <button type="button" data-view-link="profile-edit" data-profile-focus="${item.field}">Edit</button>
                </article>
            `).join("")}
        </div>`;
}

function workSamplesGallery(profile = {}, { limit = 6, viewAll = true } = {}) {
    const samples = profile.work_samples || [];
    if (!samples.length) {
        return `<p class="pp-empty">Add work photos to help clients trust your service quality.</p>`;
    }
    return `
        <div class="pp-gallery">
            ${samples.slice(0, limit).map((sample) => `
                <figure>
                    ${sample.url
                        ? `<img src="${escapeHtml(sample.url)}" alt="${escapeHtml(sample.title || "Work sample")}">`
                        : `<div class="pp-gallery__placeholder"><i class="fa-solid fa-image"></i></div>`}
                </figure>
            `).join("")}
            ${samples.length > limit ? `<button class="pp-gallery__more" type="button">+${samples.length - limit} More</button>` : ""}
        </div>
        ${viewAll && samples.length ? `<button class="pp-link-btn" type="button">View all (${samples.length}) <i class="fa-solid fa-chevron-right"></i></button>` : ""}`;
}

function certificateGallery(profile = {}) {
    const certificates = profile.certificates || [];
    return `
        <div class="pp-certs">
            ${certificates.slice(0, 3).map((item) => `
                <article class="pp-cert">
                    <i class="fa-solid fa-file-certificate"></i>
                    <strong>${escapeHtml(item.title || "Certificate")}</strong>
                    <small>${escapeHtml(item.subtitle || "")}</small>
                    ${item.verified ? `<span class="pp-cert__verified"><i class="fa-solid fa-circle-check"></i> Verified</span>` : ""}
                </article>
            `).join("")}
            <button class="pp-cert pp-cert--add" type="button" data-view-link="profile-edit">
                <i class="fa-solid fa-plus"></i>
                <span>Add New</span>
            </button>
        </div>`;
}

function ratingBreakdown(breakdown = {}, averageRating = null, reviewCount = 0, { compact = false } = {}) {
    const rows = [5, 4, 3, 2, 1].map((score) => `
        <div class="pp-breakdown__row">
            <span>${score} <i class="fa-solid fa-star"></i></span>
            <div class="pp-breakdown__bar"><i style="width:${breakdown[score] || 0}%"></i></div>
            <em>${breakdown[score] || 0}%</em>
        </div>
    `).join("");

    return `
        <div class="pp-breakdown ${compact ? "pp-breakdown--compact" : ""}">
            <div class="pp-breakdown__score">
                <strong>${averageRating || "—"}</strong>
                <span>${renderStars(averageRating || 0)}</span>
                <small>(${reviewCount} review${reviewCount === 1 ? "" : "s"})</small>
            </div>
            <div class="pp-breakdown__rows">${rows}</div>
        </div>`;
}

function reviewCards(reviews = []) {
    if (!reviews.length) {
        return `<p class="pp-empty">Client reviews will appear here after completed jobs.</p>`;
    }
    return `
        <div class="pp-reviews">
            ${reviews.slice(0, 3).map((review) => `
                <article class="pp-review">
                    <div class="pp-review__head">
                        ${avatar(review.clientName || "Client", "small")}
                        <div>
                            <strong>${escapeHtml(review.clientName || "Client")}</strong>
                            <span>${renderStars(review.score)}</span>
                        </div>
                    </div>
                    <p>${escapeHtml(review.note || "Great service experience.")}</p>
                </article>
            `).join("")}
        </div>`;
}

export function providerProfileOwnerScreen() {
    const data = profilePayloadFromStore();
    const profile = data.profile || {};
    const categories = splitList(profile.skills || profile.category || "");
    const coverage = splitList(profile.coverage_area || profile.area);

    return `
        <section class="pp-page">
            <header class="pp-toolbar">
                <div>
                    <h1>Provider Profile</h1>
                    <p>Manage your public profile and service information.</p>
                </div>
                <div class="pp-toolbar__actions">
                    <button class="btn btn-outline-primary" type="button" data-view-link="profile-preview">
                        <i class="fa-regular fa-eye"></i> Preview Public Profile
                    </button>
                    <button class="btn btn-primary" type="button" data-view-link="profile-edit">
                        <i class="fa-solid fa-pen"></i> Edit Profile
                    </button>
                </div>
            </header>

            ${ownerSummary(data)}

            <div class="pp-info-grid">
                <article class="pp-panel pp-panel--about">
                    ${panelHead("fa-user", "About Me")}
                    <p>${escapeHtml(profile.about || "Tell clients about your experience, approach, and what makes your service reliable.")}</p>
                </article>
                <article class="pp-panel">
                    ${panelHead("fa-layer-group", "Service Categories")}
                    ${serviceTags(profile)}
                </article>
                <article class="pp-panel">
                    ${panelHead("fa-screwdriver-wrench", "Specific Services")}
                    ${serviceList(profile)}
                </article>
                <article class="pp-panel pp-panel--experience">
                    ${panelHead("fa-briefcase", "Experience")}
                    <p class="pp-experience">${escapeHtml(profile.years_experience ? `${profile.years_experience}+ years of experience` : "Add your experience in Edit Profile.")}</p>
                </article>
            </div>

            <div class="pp-service-grid">
                <article class="pp-panel">
                    ${panelHead("fa-location-dot", "Coverage Area")}
                    <div class="pp-tags pp-tags--muted">
                        ${coverage.slice(0, 4).map((item) => `<span class="pp-tag pp-tag--muted">${escapeHtml(item)}</span>`).join("") || `<span class="pp-empty-inline">No coverage set</span>`}
                    </div>
                    <button class="pp-panel__action" type="button" data-view-link="profile-edit">Update Coverage Area <i class="fa-solid fa-chevron-right"></i></button>
                </article>
                <article class="pp-panel">
                    ${panelHead("fa-clock", "Availability")}
                    <p>${escapeHtml(profile.availability || "Available")}</p>
                    <button class="pp-panel__action" type="button" data-view-link="profile-edit">Update Availability <i class="fa-solid fa-chevron-right"></i></button>
                </article>
                <article class="pp-panel">
                    ${panelHead("fa-truck-medical", "Emergency Service", "", "pp-panel__icon--red")}
                    <p class="pp-emergency">${escapeHtml(profile.emergency_availability || "Not specified")}</p>
                    <button class="pp-panel__action" type="button" data-view-link="profile-edit">Update Emergency Status <i class="fa-solid fa-chevron-right"></i></button>
                </article>
            </div>

            ${pricingStrip(profile)}

            <div class="pp-media-grid">
                <article class="pp-panel">
                    ${panelHead("fa-images", "Work Samples", `<button class="pp-link-btn" type="button">View all (${(profile.work_samples || []).length || 0}) <i class="fa-solid fa-chevron-right"></i></button>`)}
                    ${workSamplesGallery(profile, { viewAll: false })}
                </article>
                <article class="pp-panel">
                    ${panelHead("fa-file-shield", "Certificates & Proof", `<button class="pp-link-btn" type="button">View all <i class="fa-solid fa-chevron-right"></i></button>`)}
                    ${certificateGallery(profile)}
                </article>
            </div>

            <section class="pp-reputation">
                <div class="pp-reputation__head">
                    <h2>Reputation Summary</h2>
                    <button class="pp-link-btn" type="button">View all reviews <i class="fa-solid fa-chevron-right"></i></button>
                </div>
                <div class="pp-reputation__body">
                    ${ratingBreakdown(data.ratingBreakdown, data.stats.averageRating, data.stats.reviewCount)}
                    ${reviewCards(data.reviews)}
                </div>
            </section>

            <p class="pp-footer-tip">Keep your profile updated to get more matches and build client trust.</p>
        </section>`;
}

export function providerProfilePreviewScreen() {
    return providerPublicProfileScreen(store.providerProfileDetail || profilePayloadFromStore(), {
        preview: true,
        showBack: true,
    });
}

export function providerPublicProfileScreen(data, { preview = false, showBack = false, showActions = false } = {}) {
    if (!data?.profile) {
        return `<div class="pp-page"><p class="pp-empty">Provider profile unavailable.</p></div>`;
    }

    const profile = data.profile;
    const user = data.user || {};
    const stats = data.stats || {};
    const skills = splitList(profile.skills || profile.category);
    const displayName = profile.display_name || user.name || "Provider";
    const tagline = profile.tagline || `${profile.category || "Service"} Specialist`;
    const samples = profile.work_samples || [];

    return `
        <section class="pp-page pp-page--preview">
            <header class="pp-toolbar">
                <div class="pp-toolbar__title">
                    ${showBack ? `<button class="pp-back" type="button" data-view-link="${preview ? "profile" : "providers"}"><i class="fa-solid fa-arrow-left"></i></button>` : ""}
                    <div>
                        <h1>${preview ? "Provider Profile Preview" : escapeHtml(displayName)}</h1>
                        <p>${preview ? "This is how clients see your profile on KAILA." : `${escapeHtml(profile.category || "Services")} · ${escapeHtml(user.area || "")}`}</p>
                    </div>
                </div>
                ${preview ? `<button class="btn btn-outline-primary" type="button" data-view-link="profile-edit"><i class="fa-solid fa-pen"></i> Edit My Profile</button>` : ""}
            </header>

            <div class="pp-preview-layout">
                <main class="pp-preview-main">
                    <article class="pp-public-card">
                        <div class="pp-public-card__top">
                            <div class="pp-public-card__avatar">
                                ${avatar(displayName, "large", user.social_photo_url || "")}
                                <span class="pp-online-dot"></span>
                            </div>
                            <div class="pp-public-card__meta">
                                <div class="pp-public-card__title">
                                    <h2>${escapeHtml(displayName)}</h2>
                                    ${profile.trust_level ? `<span class="pp-badge pp-badge--verified"><i class="fa-solid fa-circle-check"></i> Verified Provider</span>` : ""}
                                </div>
                                <p>${escapeHtml(tagline)}</p>
                                ${stats.averageRating >= 4.7 ? `<span class="pp-badge pp-badge--top"><i class="fa-solid fa-medal"></i> Top Rated Provider</span>` : ""}
                                <div class="pp-public-card__rating">
                                    <strong>${stats.averageRating || "—"}</strong>
                                    <span>${renderStars(stats.averageRating || 0)}</span>
                                    <em>(${stats.reviewCount || 0} reviews)</em>
                                    ${stats.recommendRate ? `<span class="pp-recommend"><i class="fa-solid fa-thumbs-up"></i> ${stats.recommendRate}% Recommend</span>` : ""}
                                </div>
                                <div class="pp-tags">
                                    ${skills.slice(0, 5).map((item) => `<span class="pp-tag pp-tag--muted">${escapeHtml(item)}</span>`).join("")}
                                    ${skills.length > 5 ? `<span class="pp-tag pp-tag--more">+${skills.length - 5} more</span>` : ""}
                                </div>
                                <div class="pp-public-card__facts">
                                    <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(user.area || profile.area || "—")}</span>
                                    <span><i class="fa-regular fa-clock"></i> ${escapeHtml(profile.availability || "Available")}</span>
                                    ${profile.response_time ? `<span class="pp-response-pill"><i class="fa-solid fa-bolt"></i> Usually responds in ${escapeHtml(profile.response_time)}</span>` : ""}
                                </div>
                            </div>
                        </div>
                    </article>

                    <div class="pp-stat-tiles">
                        <article class="pp-stat-tile pp-stat-tile--blue">
                            <span><i class="fa-solid fa-clipboard-check"></i></span>
                            <strong>${stats.completedJobs || 0}</strong>
                            <small>Jobs done</small>
                        </article>
                        <article class="pp-stat-tile pp-stat-tile--yellow">
                            <span><i class="fa-regular fa-face-smile"></i></span>
                            <strong>${stats.reviewCount || 0}+</strong>
                            <small>Positive feedback</small>
                        </article>
                        <article class="pp-stat-tile pp-stat-tile--purple">
                            <span><i class="fa-solid fa-trophy"></i></span>
                            <strong>${escapeHtml(profile.years_experience ? `${profile.years_experience}+` : "—")}</strong>
                            <small>In this field</small>
                        </article>
                        <article class="pp-stat-tile pp-stat-tile--cyan">
                            <span><i class="fa-solid fa-shield-halved"></i></span>
                            <strong>${stats.responseRate ? `${stats.responseRate}%` : "—"}</strong>
                            <small>Very responsive</small>
                        </article>
                    </div>

                    <article class="pp-panel">
                        ${panelHead("fa-images", "Work Samples", samples.length ? `<button class="pp-link-btn" type="button">View All Photos <i class="fa-solid fa-arrow-right"></i></button>` : "")}
                        ${workSamplesGallery(profile, { limit: 4, viewAll: false })}
                    </article>

                    <article class="pp-panel">
                        ${panelHead("fa-file-shield", "Certifications & Documents", `<button class="pp-link-btn" type="button">View All <i class="fa-solid fa-arrow-right"></i></button>`)}
                        ${certificateGallery(profile)}
                    </article>

                    <article class="pp-quote">
                        ${panelHead("fa-quote-left", "Why clients hire me")}
                        <blockquote>${escapeHtml(profile.about || "I do quality work, arrive on time, and make sure every problem is fixed the right way.")} — ${escapeHtml(displayName)}</blockquote>
                    </article>
                </main>

                <aside class="pp-preview-aside">
                    <article class="pp-side-trust">
                        <span class="pp-side-trust__icon"><i class="fa-solid fa-shield-halved"></i></span>
                        <h3>Trusted & Verified</h3>
                        <p>Background checked. Identity and documents verified.</p>
                        <ul>
                            <li><i class="fa-solid fa-circle-check"></i> Professional Verified</li>
                            <li><i class="fa-solid fa-circle-check"></i> ID & Documents Verified</li>
                            <li><i class="fa-solid fa-circle-check"></i> KAILA Quality Standard</li>
                        </ul>
                    </article>

                    <article class="pp-side-card">
                        <h3>Price & Fee Info</h3>
                        <p><span><i class="fa-solid fa-tags"></i> Price Range</span><strong>${escapeHtml(profile.price_range || "—")}</strong></p>
                        <p><span><i class="fa-solid fa-coins"></i> Minimum Service Fee</span><strong>${escapeHtml(profile.minimum_fee || "—")}</strong></p>
                    </article>

                    <article class="pp-side-card">
                        <h3>Client Rating Breakdown</h3>
                        ${ratingBreakdown(data.ratingBreakdown, stats.averageRating, stats.reviewCount, { compact: true })}
                        <button class="pp-link-btn" type="button">See all reviews <i class="fa-solid fa-arrow-right"></i></button>
                    </article>

                    ${showActions || preview ? `
                        <div class="pp-side-actions">
                            <button class="btn btn-primary w-100" type="button" data-view-link="inbox">
                                <i class="fa-solid fa-comment-dots"></i> Message ${escapeHtml(firstName(displayName))}
                            </button>
                            <button class="btn btn-outline-primary w-100" type="button" data-toast="Provider saved to your list.">
                                <i class="fa-regular fa-bookmark"></i> Save Provider
                            </button>
                        </div>
                    ` : ""}
                </aside>
            </div>
        </section>`;
}

function firstName(name = "") {
    return String(name).trim().split(/\s+/)[0] || "Provider";
}

export function providerProfileEditScreen(categories = []) {
    const profile = store.user?.provider_profile || {};

    return `
        <section class="pp-page">
            <header class="pp-toolbar">
                <div class="pp-toolbar__title">
                    <button class="pp-back" type="button" data-view-link="profile"><i class="fa-solid fa-arrow-left"></i></button>
                    <div>
                        <h1>Edit Profile</h1>
                        <p>Update the information clients see on your public profile.</p>
                    </div>
                </div>
            </header>
            <form class="pp-edit" data-provider-profile>
                <div class="pp-edit__grid">
                    <label>Display name<input class="form-control" name="display_name" value="${escapeHtml(profile.display_name || store.user?.name || "")}"></label>
                    <label>Professional tagline<input class="form-control" name="tagline" value="${escapeHtml(profile.tagline || "")}" placeholder="Plumbing Specialist"></label>
                    <label>Provider type
                        <select class="form-select" name="provider_type">
                            ${["Individual", "Freelancer", "Shop", "Small team", "Business"].map((type) => `
                                <option ${type === (profile.provider_type || "Individual") ? "selected" : ""}>${type}</option>
                            `).join("")}
                        </select>
                    </label>
                    <label>Category
                        <select class="form-select" name="category" required>
                            ${categories.map((item) => `<option ${item === (profile.category || categories[0]) ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
                        </select>
                    </label>
                    <label>Primary area<input class="form-control" name="area" value="${escapeHtml(profile.area || store.user?.area || "")}" required></label>
                    <label>Availability<input class="form-control" name="availability" value="${escapeHtml(profile.availability || "Available")}" required></label>
                    <label>Emergency availability<input class="form-control" name="emergency_availability" value="${escapeHtml(profile.emergency_availability || "")}"></label>
                    <label>Response time<input class="form-control" name="response_time" value="${escapeHtml(profile.response_time || "")}" placeholder="Within 30 min"></label>
                    <label>Years of experience<input class="form-control" name="years_experience" value="${escapeHtml(profile.years_experience || "")}"></label>
                    <label>Minimum fee<input class="form-control" name="minimum_fee" value="${escapeHtml(profile.minimum_fee || "")}"></label>
                    <label>Price range<input class="form-control" name="price_range" value="${escapeHtml(profile.price_range || "")}"></label>
                    <label>Travel limit<input class="form-control" name="travel_limit" value="${escapeHtml(profile.travel_limit || "")}" placeholder="Up to 15 km"></label>
                    <label class="pp-edit__wide">About me<textarea class="form-control" name="about" rows="4">${escapeHtml(profile.about || "")}</textarea></label>
                    <label class="pp-edit__wide">Specific services<textarea class="form-control" name="specific_services" rows="3">${escapeHtml(profile.specific_services || "")}</textarea></label>
                    <label class="pp-edit__wide">Service categories / skills<textarea class="form-control" name="skills" rows="2" placeholder="Plumbing, Electrical, Water Systems">${escapeHtml(profile.skills || "")}</textarea></label>
                    <label class="pp-edit__wide">Coverage area<textarea class="form-control" name="coverage_area" rows="2">${escapeHtml(profile.coverage_area || "")}</textarea></label>
                </div>
                <input type="hidden" name="rules_agreement" value="1">
                <div class="pp-edit__actions">
                    <button class="btn btn-light" type="button" data-view-link="profile">Cancel</button>
                    <button class="btn btn-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save profile</button>
                </div>
            </form>
        </section>`;
}

export function bindProviderProfileActions({ toast, navigate, categories = [], loadProfileForUser }) {
    document.querySelector("[data-provider-profile]")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            await saveProvider(Object.fromEntries(new FormData(event.target)));
            toast("Profile saved.");
            navigate("profile");
        } catch (error) {
            toast(error.message);
        }
    });

    document.querySelectorAll("[data-provider-profile-view]").forEach((button) => {
        button.addEventListener("click", async () => {
            const userId = Number(button.dataset.providerProfileView);
            if (!userId || !loadProfileForUser) return;
            try {
                await loadProfileForUser(userId);
                navigate("provider-detail");
            } catch (error) {
                toast(error.message);
            }
        });
    });

    const focusField = document.querySelector("[data-profile-focus]")?.dataset.profileFocus;
    if (focusField) {
        document.querySelector(`[name="${focusField}"]`)?.focus();
    }
}

export async function ensureOwnerProfileDetail(userId) {
    if (!store.providerProfileDetail || store.providerProfileDetail.user?.id !== userId) {
        const { loadProviderProfile } = await import("./kaila-api.js");
        await loadProviderProfile(userId);
    }
}
