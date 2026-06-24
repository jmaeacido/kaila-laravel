<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="theme-color" content="#06b6d4">
    <title>KAILA</title>
    <link rel="manifest" href="/manifest.webmanifest">
    <link rel="icon" href="/icon-192.png">
    @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    @endif
    <script>
        window.KAILA = {
            user: @json(auth()->user()),
            categories: @json($categories),
            urgencies: @json($urgencies),
            vapidPublicKey: @json($vapidPublicKey),
        };
    </script>
</head>
<body>
    <div id="app" class="app-shell">
        <aside class="rail">
            <a class="brand" href="/">
                <img src="/kaila-logo.svg" alt="KAILA">
            </a>
            <nav class="rail-nav" aria-label="Main navigation">
                <button class="nav-btn active" data-tab="home" title="Home">H</button>
                <button class="nav-btn" data-tab="jobs" title="Jobs">J</button>
                <button class="nav-btn" data-tab="post" title="Post">+</button>
                <button class="nav-btn" data-tab="messages" title="Messages">M</button>
                <button class="nav-btn" data-tab="settings" title="Settings">S</button>
            </nav>
        </aside>

        <main class="main">
            <header class="topbar">
                <div>
                    <p class="eyebrow">Local services marketplace</p>
                    <h1 id="screen-title">KAILA</h1>
                </div>
                <div class="top-actions">
                    <button class="role-switch" data-role-toggle hidden></button>
                    <button class="bell" data-tab-jump="notifications" title="Notifications">
                        <span>N</span>
                        <b data-badge hidden>0</b>
                    </button>
                </div>
            </header>

            @guest
                <section class="auth-grid">
                    <div class="auth-intro">
                        <img src="/kaila-logo.svg" alt="KAILA">
                        <h2>Post a need. Compare offers. Hire local help fast.</h2>
                        <p>KAILA connects clients with nearby providers through urgent alerts, job chats, completion checks, and ratings.</p>
                    </div>
                    <div class="auth-card">
                        <div class="segmented" role="tablist">
                            <button class="active" data-auth-mode="login">Login</button>
                            <button data-auth-mode="register">Register</button>
                        </div>
                        <form id="login-form" class="stack">
                            <label>Username or email<input name="username" required autocomplete="username"></label>
                            <label>Password<input name="password" type="password" required autocomplete="current-password"></label>
                            <button class="primary" type="submit">Enter KAILA</button>
                        </form>
                        <form id="register-form" class="stack" hidden>
                            <label>Name<input name="name" required autocomplete="name"></label>
                            <label>Username<input name="username" required minlength="3" autocomplete="username"></label>
                            <label>Email<input name="email" type="email" autocomplete="email"></label>
                            <label>Password<input name="password" type="password" required minlength="8" autocomplete="new-password"></label>
                            <label>Start as<select name="role"><option value="client">Client</option><option value="provider">Provider</option></select></label>
                            <label>Area<input name="area" required placeholder="Barangay, city"></label>
                            <label>Primary service<select name="category" data-category-options></select></label>
                            <label class="check"><input type="checkbox" name="data_privacy_consent" value="1" required> I agree to KAILA handling my account and marketplace data.</label>
                            <button class="primary" type="submit">Create account</button>
                        </form>
                        <p class="form-note" data-auth-message></p>
                    </div>
                </section>
            @else
                <section class="content-grid">
                    <div class="panel focus-panel" data-panel="home">
                        <div class="home-hero">
                            <div>
                                <p class="eyebrow">Welcome back</p>
                                <h2 data-home-title>Find help nearby</h2>
                                <p data-home-copy>Post a clear request and providers in your category get notified right away.</p>
                            </div>
                            <button class="primary" data-tab-jump="post">Post a request</button>
                        </div>
                        <div class="metric-row">
                            <div><b data-metric="open">0</b><span>Open</span></div>
                            <div><b data-metric="offers">0</b><span>Offers</span></div>
                            <div><b data-metric="active">0</b><span>Active</span></div>
                            <div><b data-metric="unread">0</b><span>Unread</span></div>
                        </div>
                        <div class="section-head">
                            <h3>Live opportunities</h3>
                            <button class="ghost" data-refresh>Refresh</button>
                        </div>
                        <div class="card-list" data-home-list></div>
                    </div>

                    <div class="panel" data-panel="jobs" hidden>
                        <div class="section-head">
                            <h3>Jobs</h3>
                            <select data-job-filter>
                                <option value="all">All jobs</option>
                                <option value="mine">Mine</option>
                                <option value="available">Available</option>
                                <option value="active">Active</option>
                                <option value="closed">Closed</option>
                            </select>
                        </div>
                        <div class="card-list" data-job-list></div>
                    </div>

                    <div class="panel" data-panel="post" hidden>
                        <div class="section-head">
                            <h3>Post a service need</h3>
                            <span class="soft-label">Fast request flow</span>
                        </div>
                        <form id="request-form" class="form-grid">
                            <label>Category<select name="category" data-category-options required></select></label>
                            <label>Urgency<select name="urgency" data-urgency-options required></select></label>
                            <label>Area<input name="area" required placeholder="Barangay, city"></label>
                            <label>Budget<input name="budget" placeholder="e.g. ₱500-₱1,000"></label>
                            <label>Preferred schedule<input name="preferred_schedule" placeholder="Today after 4 PM"></label>
                            <label>Contact method<input name="contact_method" placeholder="Chat first, then call"></label>
                            <label class="wide">Location notes<textarea name="exact_location_notes" rows="2" placeholder="Landmark, gate color, parking, access notes"></textarea></label>
                            <label class="wide">Details<textarea name="details" rows="5" required minlength="10" placeholder="What happened, what you need done, and anything providers should know"></textarea></label>
                            <label class="check wide"><input type="checkbox" name="permission_to_forward" value="1"> Providers may receive enough location/contact detail to quote accurately.</label>
                            <label class="check wide"><input type="checkbox" name="consent_to_rate" value="1" checked> I agree to rate and be rated after completion.</label>
                            <button class="primary wide" type="submit">Post request</button>
                        </form>
                    </div>

                    <div class="panel" data-panel="messages" hidden>
                        <div class="section-head">
                            <h3>Messages</h3>
                            <span class="soft-label" data-message-context>Select an active job</span>
                        </div>
                        <div class="message-layout">
                            <div class="thread-list" data-thread-list></div>
                            <div class="conversation">
                                <div class="messages" data-messages></div>
                                <form id="message-form" class="message-form">
                                    <input name="body" placeholder="Write a job message" autocomplete="off">
                                    <button class="primary" type="submit">Send</button>
                                </form>
                            </div>
                        </div>
                    </div>

                    <div class="panel" data-panel="notifications" hidden>
                        <div class="section-head">
                            <h3>Notifications</h3>
                            <button class="ghost" data-mark-read>Mark read</button>
                        </div>
                        <div class="card-list compact" data-notification-list></div>
                    </div>

                    <div class="panel" data-panel="settings" hidden>
                        <div class="settings-grid">
                            <section>
                                <div class="section-head"><h3>Provider profile</h3><span class="soft-label">Required for offers</span></div>
                                <form id="provider-form" class="form-grid">
                                    <label>Display name<input name="display_name"></label>
                                    <label>Provider type<select name="provider_type"><option>Individual</option><option>Freelancer</option><option>Shop</option><option>Small team</option><option>Business</option></select></label>
                                    <label>Category<select name="category" data-category-options required></select></label>
                                    <label>Area<input name="area" required></label>
                                    <label>Availability<input name="availability" required value="Available"></label>
                                    <label>Experience<input name="years_experience" placeholder="3-5 years"></label>
                                    <label class="wide">Services<textarea name="specific_services" rows="2"></textarea></label>
                                    <label class="wide">Coverage area<textarea name="coverage_area" rows="2"></textarea></label>
                                    <label class="wide">Skills<textarea name="skills" rows="2"></textarea></label>
                                    <label>Minimum fee<input name="minimum_fee"></label>
                                    <label>Price range<input name="price_range"></label>
                                    <label class="check wide"><input type="checkbox" name="rules_agreement" value="1" required> I agree to provider rules and fair quoting.</label>
                                    <button class="primary wide" type="submit">Save provider profile</button>
                                </form>
                            </section>
                            <section>
                                <div class="section-head"><h3>Push & account</h3><span class="soft-label" data-push-state>Checking</span></div>
                                <div class="settings-card">
                                    <p>Web Push sends browser/PWA notifications when KAILA is closed and the device is online.</p>
                                    <button class="primary" data-enable-push>Enable push</button>
                                    <button class="ghost danger" data-logout>Logout</button>
                                </div>
                                <div class="section-head"><h3>Community feed</h3><span class="soft-label">Public posts</span></div>
                                <form id="feed-form" class="message-form">
                                    <input name="body" placeholder="Share an availability update">
                                    <button class="primary" type="submit">Post</button>
                                </form>
                                <div class="card-list compact" data-feed-list></div>
                            </section>
                        </div>
                    </div>
                </section>
            @endguest
        </main>

        @auth
            <nav class="bottom-nav" aria-label="Mobile navigation">
                <button class="active" data-tab="home">Home</button>
                <button data-tab="jobs">Jobs</button>
                <button data-tab="post">Post</button>
                <button data-tab="messages">Chat</button>
                <button data-tab="settings">Me</button>
            </nav>
        @endauth
    </div>
    <div class="toast-host" data-toasts></div>
</body>
</html>
