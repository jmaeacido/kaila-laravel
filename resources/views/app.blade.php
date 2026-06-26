<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="theme-color" content="#06b6d4">
    <title>KAILA</title>
    <link rel="manifest" href="/manifest.webmanifest">
    <link rel="icon" href="/assets/brand/kaila-app-icon-512.png">
    <link rel="apple-touch-icon" href="/assets/brand/kaila-app-icon-512.png">
    @guest
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
        @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
            @vite(['resources/css/app.css', 'resources/js/app.js'])
        @endif
    @else
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer">
        @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
            @vite(['resources/css/kaila-ui.css', 'resources/js/marketplace-ui.js'])
        @endif
    @endguest
    <script>
        window.KAILA = {
            user: @json(auth()->user()),
            categories: @json($categories),
            urgencies: @json($urgencies),
            address: @json($address),
            vapidPublicKey: @json($vapidPublicKey),
            socketUrl: @json($socketUrl ?? config('kaila.socket.url')),
            socketPath: @json($socketPath ?? config('kaila.socket.client_path')),
        };
    </script>
</head>
<body>
    <div id="app" class="app-shell @guest guest-shell @endguest">
        <main class="main">
            @guest
                @php
                    $legalPages = [
                        'privacy-policy' => [
                            'label' => 'Privacy Policy',
                            'eyebrow' => 'KAILA pilot policy',
                            'title' => 'Privacy Policy',
                            'lede' => 'Last updated June 6, 2026',
                            'heroIcon' => 'bi-shield-lock',
                            'items' => [
                                ['bi-database-lock', 'What We Collect', 'KAILA collects account details, role, contact preferences, service request information, provider profiles, offers, messages, call signaling records, uploaded media, ratings, reports, blocks, device push tokens, validation survey/interview entries, location pins, and operational logs needed to run the pilot marketplace.'],
                                ['bi-diagram-3', 'How We Use Data', 'We use data to match clients and providers, estimate route distance, support live job-site navigation, operate chat and calls, send notifications, support disputes, protect users, improve local service quality, and measure pilot performance.'],
                                ['bi-geo-alt', 'Location And Navigation', 'Users may pin a job site or share device location to estimate distance and show navigation. Live tracking runs only after the user starts it and may continue while the navigation map is minimized until the user stops navigation or closes the map.'],
                                ['bi-share', 'Sharing', 'Contact details and job-site details are shared only when needed for accepted jobs, support handling, dispute review, or safety review. KAILA does not sell pilot user data.'],
                                ['bi-chat-square-heart', 'Messages, Media, Reports, And Ratings', 'Job messages and direct support messages may be reviewed by authorized staff for support, safety, dispute handling, and abuse prevention. Ratings are shown after both sides rate or the rating window closes.'],
                                ['bi-clipboard-data', 'Validation Research', 'Client surveys and provider interviews are used for pilot planning, matching decisions, and product validation. Staff should avoid collecting unnecessary sensitive information and may use nicknames when a full name is not needed.'],
                                ['bi-sliders', 'Your Choices', 'You can update profile details, block users, report users or jobs, contact support, disable device notifications, and request account deletion from Settings.'],
                                ['bi-archive', 'Retention', 'Account deletion removes login access and anonymizes profile/contact details. Job, rating, report, and message history may be retained where needed for safety, dispute, legal, or operational records.'],
                                ['bi-headset', 'Contact', 'Use Contact Support in the app for privacy questions, account help, or safety concerns.'],
                            ],
                        ],
                        'terms' => [
                            'label' => 'Terms',
                            'eyebrow' => 'KAILA pilot rules',
                            'title' => 'Terms of Service',
                            'lede' => 'Last updated June 6, 2026',
                            'heroIcon' => 'bi-file-earmark-check',
                            'items' => [
                                ['bi-shop-window', 'Marketplace Role', 'KAILA helps clients and providers find each other, compare offers, coordinate work, and keep job records. Providers are independent service providers, not KAILA employees.'],
                                ['bi-person-check', 'User Responsibilities', 'Use accurate information, communicate respectfully, honor accepted offers, avoid unsafe or illegal work, and do not use KAILA to harass, scam, spam, impersonate, or mislead others.'],
                                ['bi-briefcase', 'Jobs, Offers, And Completion', 'Clients choose providers from submitted offers. Providers should state price, schedule, and scope clearly. Completion, revision, dispute, and rating flows must be used honestly.'],
                                ['bi-map', 'Location, Navigation, And Contact', 'Users should pin accurate job or provider locations only when they are authorized to share them. Navigation, route distance, calls, and messages are coordination tools; users remain responsible for safe travel, lawful conduct, and verifying final job details.'],
                                ['bi-shield-exclamation', 'Safety And Moderation', 'KAILA may review reports, block abusive behavior, restrict accounts, remove unsafe content, or preserve records needed to investigate disputes and protect users.'],
                                ['bi-star', 'Ratings', 'Ratings should describe real job experiences. False, abusive, or retaliatory reviews may be investigated by support.'],
                                ['bi-clipboard-check', 'Validation And Staff Use', 'Staff and admins must record validation surveys, provider interviews, support notes, and moderation actions accurately. They must not use KAILA data for unrelated personal purposes.'],
                                ['bi-info-circle', 'Limitations', 'The pilot is provided as-is and may change as KAILA validates local marketplace operations. KAILA is not responsible for independent provider workmanship, pricing, or offline conduct, but support will help document and triage disputes.'],
                                ['bi-person-gear', 'Account Changes', 'KAILA may suspend or remove accounts that violate these terms. Users may delete their account from Settings, subject to safety and operational record retention.'],
                            ],
                        ],
                        'support' => [
                            'label' => 'Contact Support',
                            'eyebrow' => 'Help desk',
                            'title' => 'Contact Support',
                            'lede' => 'Use the in-app support desk after login for the fastest response.',
                            'heroIcon' => 'bi-headset',
                            'items' => [
                                ['bi-question-circle', 'When To Contact Support', 'Contact support for account access, job coordination, unsafe behavior, reports, blocked users, disputes, ratings concerns, privacy questions, or provider/client guidance.'],
                                ['bi-chat-dots', 'Inside The App', 'After login, open Customer Service from Quick actions or the Support tab to message an official KAILA support account.'],
                                ['bi-card-checklist', 'What To Include', 'Include the job category, area, usernames involved, what happened, screenshots or media when useful, whether location/navigation was involved, and what outcome you need.'],
                            ],
                            'actions' => [
                                ['/login', 'Login For Support', 'bi-box-arrow-in-right'],
                                ['/privacy-policy', 'Privacy Policy', 'bi-shield-lock'],
                            ],
                        ],
                    ];
                    $pageKey = trim(request()->path(), '/');
                    $legalPage = $legalPages[$pageKey] ?? null;
                @endphp

                @if (request()->is('/'))
                    <section class="landing-page">
                        <header class="landing-header">
                            <a class="landing-logo" href="/">
                                <img src="/assets/brand/kaila-logo.png" alt="KAILA">
                            </a>
                            <nav class="landing-links" aria-label="Landing navigation">
                                <a href="#how-it-works">How It Works</a>
                                <a href="/register?role=provider">For Providers</a>
                                <a href="#support">Support</a>
                                <a class="landing-login" href="/login">Login</a>
                            </nav>
                            <button class="mobile-bell" type="button" aria-label="Notifications"><i class="bi bi-bell"></i><span></span></button>
                        </header>

                        <div class="landing-hero">
                            <div class="landing-copy">
                                <h1 class="desktop-title">Local services.<br><span>Done right.</span></h1>
                                <h1 class="mobile-title">Find trusted<br><span>local service</span><br>providers.</h1>
                                <p class="landing-lede desktop-only">Post a request, compare offers from trusted local providers, and get the job done.</p>
                                <p class="landing-lede mobile-only">Post a request, receive offers, compare and hire with confidence.</p>

                                <div class="landing-actions desktop-only">
                                    <a class="landing-primary" href="/register">
                                        <i class="bi bi-person-plus" aria-hidden="true"></i>
                                        Create Account / Post a Request
                                        <i class="bi bi-arrow-right" aria-hidden="true"></i>
                                    </a>
                                    <a class="landing-secondary" href="/login">
                                        <i class="bi bi-box-arrow-in-right" aria-hidden="true"></i>
                                        Login
                                        <i class="bi bi-arrow-right" aria-hidden="true"></i>
                                    </a>
                                </div>

                                <div class="rating-row desktop-only" aria-label="4.8 out of 5 from more than 2500 clients">
                                    <span class="avatar-stack"><i></i><i></i><i></i><i></i></span>
                                    <span class="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                                    <b>4.8/5 from 2,500+ clients</b>
                                </div>
                            </div>

                            <div class="landing-visual" aria-hidden="true">
                                <img class="phone-mock" src="/assets/landing/phone-mock.png" alt="">
                                <div class="provider-art">
                                    <img class="hero-asset hero-asset-desktop" src="/assets/landing/hero-desktop.png" alt="">
                                    <img class="hero-asset hero-asset-mobile" src="/assets/landing/hero-mobile.png" alt="">
                                </div>
                            </div>
                        </div>

                        <div class="mobile-feature-list mobile-only" id="how-it-works">
                            <div><span class="feature-icon shield"><i class="bi bi-shield-check"></i></span><p><b>Find trusted</b><br>local service providers.</p></div>
                            <div><span class="feature-icon scales"><i class="bi bi-list-check"></i></span><p><b>Compare offers</b><br>before hiring.</p></div>
                            <div><span class="feature-icon chat"><i class="bi bi-chat-dots-fill"></i></span><p><b>Chat, call, and</b><br>track jobs in one place.</p></div>
                            <div><span class="feature-icon pin"><i class="bi bi-geo-alt-fill"></i></span><p><b>Built for your</b><br>local service needs.</p></div>
                        </div>

                        <section class="feature-strip desktop-only" id="how-it-works">
                            <article><span class="feature-icon shield"><i class="bi bi-shield-check"></i></span><div><h3>Find trusted<br>local service providers.</h3><p>All providers are verified and reviewed by clients.</p></div></article>
                            <article><span class="feature-icon tag"><i class="bi bi-tag"></i></span><div><h3>Compare offers<br>before hiring.</h3><p>Choose the best price, ratings, and availability.</p></div></article>
                            <article><span class="feature-icon chat"><i class="bi bi-chat-dots"></i></span><div><h3>Chat, call, and<br>track jobs in one place.</h3><p>Stay updated from start to finish.</p></div></article>
                            <article><span class="feature-icon pin"><i class="bi bi-geo-alt"></i></span><div><h3>Built for<br>local service needs.</h3><p>Fast, convenient, and made for your area.</p></div></article>
                        </section>

                        <section class="popular-services" id="for-providers">
                            <div class="services-head">
                                <h2>Popular Services</h2>
                                <a class="mobile-only" href="/register">View all</a>
                            </div>
                            <div class="service-grid">
                                <a href="/register"><span class="service-icon plumbing"><i class="bi bi-droplet"></i></span><b>Plumbing</b></a>
                                <a href="/register"><span class="service-icon repair"><i class="bi bi-tools"></i></span><b>Repair</b></a>
                                <a href="/register"><span class="service-icon cleaning"><i class="bi bi-bucket"></i></span><b>Cleaning</b></a>
                                <a href="/register"><span class="service-icon electrical"><i class="bi bi-lightning-charge-fill"></i></span><b>Electrical</b></a>
                                <a href="/register"><span class="service-icon errands"><i class="bi bi-bag"></i></span><b>Errands</b></a>
                                <a href="/register"><span class="service-icon home-help"><i class="bi bi-house-door"></i></span><b>Home Help</b></a>
                            </div>
                            <a class="view-services desktop-only" href="/register">View all services <span>-&gt;</span></a>
                        </section>

                        <section class="mobile-safety mobile-only">
                            <span class="feature-icon shield"><i class="bi bi-shield-check"></i></span>
                            <p>Verified professionals.<br>Secure payments.</p>
                            <span class="payment-icons"><i class="bi bi-lock-fill"></i><i class="bi bi-credit-card-2-front-fill"></i></span>
                        </section>

                        <div class="landing-actions mobile-actions mobile-only">
                            <a class="landing-primary" href="/register"><i class="bi bi-plus-circle"></i>Create Account / Post a Request</a>
                            <a class="landing-secondary" href="/login"><i class="bi bi-box-arrow-in-right"></i>Login</a>
                        </div>

                        <footer class="landing-footer" id="support">
                            <div class="footer-safety desktop-only">
                                <i class="footer-shield bi bi-shield-check" aria-hidden="true"></i>
                                <p><b>Your safety is our priority.</b><br>Secure payments. Protected data.</p>
                            </div>
                            <nav>
                                <a href="/privacy-policy">Privacy Policy</a>
                                <a href="/terms">Terms<span class="desktop-only"> of Service</span></a>
                                <a href="/support">Contact Support</a>
                            </nav>
                            <p class="desktop-only">&copy; 2025 KAILA. All rights reserved.</p>
                        </footer>
                    </section>
                @elseif ($legalPage)
                    <section class="landing-page legal-page">
                        <header class="landing-header legal-header">
                            <a class="landing-logo" href="/">
                                <img src="/assets/brand/kaila-logo.png" alt="KAILA">
                            </a>
                            <nav class="landing-links" aria-label="Page navigation">
                                <a href="/">Home</a>
                                <a href="/privacy-policy">Privacy Policy</a>
                                <a href="/terms">Terms</a>
                                <a href="/support">Support</a>
                                <a class="landing-login" href="/login">Login</a>
                            </nav>
                        </header>

                        <main class="legal-content">
                            <a class="legal-back" href="/" data-history-back><i class="bi bi-arrow-left" aria-hidden="true"></i>Back</a>
                            <div class="legal-hero-title">
                                <span class="legal-hero-icon"><i class="bi {{ $legalPage['heroIcon'] }}" aria-hidden="true"></i></span>
                                <div>
                                    <p class="legal-eyebrow">{{ $legalPage['eyebrow'] }}</p>
                                    <h1>{{ $legalPage['title'] }}</h1>
                                    <p class="legal-lede">{{ $legalPage['lede'] }}</p>
                                </div>
                            </div>

                            <div class="legal-grid">
                                @foreach ($legalPage['items'] as [$icon, $heading, $body])
                                    <article>
                                        <span class="legal-card-icon"><i class="bi {{ $icon }}" aria-hidden="true"></i></span>
                                        <div>
                                            <h2>{{ $heading }}</h2>
                                            <p>{{ $body }}</p>
                                        </div>
                                        <i class="bi bi-chevron-right legal-card-arrow" aria-hidden="true"></i>
                                    </article>
                                @endforeach
                            </div>

                            @isset($legalPage['actions'])
                                <div class="legal-actions">
                                    @foreach ($legalPage['actions'] as [$href, $label, $icon])
                                        <a class="{{ $loop->first ? 'landing-primary' : 'landing-secondary' }} legal-action" href="{{ $href }}">
                                            <i class="bi {{ $icon }}" aria-hidden="true"></i>
                                            {{ $label }}
                                            <i class="bi bi-arrow-right" aria-hidden="true"></i>
                                        </a>
                                    @endforeach
                                </div>
                            @endisset
                        </main>

                        <footer class="landing-footer legal-footer">
                            <div class="footer-safety desktop-only">
                                <i class="footer-shield bi bi-shield-check" aria-hidden="true"></i>
                                <p><b>Your safety is our priority.</b><br>Secure payments. Protected data.</p>
                            </div>
                            <nav>
                                <a href="/privacy-policy">Privacy Policy</a>
                                <a href="/terms">Terms<span class="desktop-only"> of Service</span></a>
                                <a href="/support">Contact Support</a>
                            </nav>
                            <p class="desktop-only">&copy; 2025 KAILA. All rights reserved.</p>
                        </footer>
                    </section>
                @elseif (request()->is('login'))
                <section class="client-login-page">
                    <div class="login-shell">
                        <aside class="login-brand-panel desktop-only">
                            <div class="login-brand-inner">
                                <a class="landing-logo" href="/"><img src="/assets/brand/kaila-logo.png" alt="KAILA"></a>
                                <p class="login-tagline">Local services. Done right.</p>
                                <h1>Trusted local pros.<br>Reliable results.</h1>
                                <p>KAILA connects you with verified professionals for home and business services you can trust.</p>
                                <div class="login-benefits">
                                    <article><span class="feature-icon shield"><i class="bi bi-shield-check"></i></span><p><b>Verified Professionals</b><br>All providers are background-checked</p></article>
                                    <article><span class="feature-icon scales"><i class="bi bi-lock"></i></span><p><b>Secure &amp; Encrypted</b><br>Your data and payments are protected</p></article>
                                    <article><span class="feature-icon chat"><i class="bi bi-chat-square-dots"></i></span><p><b>Real-time Communication</b><br>Chat, call, and track your job in real-time</p></article>
                                    <article><span class="feature-icon pin"><i class="bi bi-patch-check"></i></span><p><b>Satisfaction Guaranteed</b><br>Pay only when you're 100% satisfied</p></article>
                                </div>
                            </div>
                            <img class="login-road-art" src="/assets/login/login-local-road.png" alt="" aria-hidden="true">
                        </aside>

                        <main class="login-card">
                            <div class="login-mobile-top mobile-only">
                                <a class="landing-logo" href="/"><img src="/assets/brand/kaila-logo.png" alt="KAILA"></a>
                                <p>Local services. Done right.</p>
                                <div class="login-mobile-benefits">
                                    <article><i class="bi bi-shield-check"></i><span>Verified<br>Professionals</span></article>
                                    <article><i class="bi bi-chat-dots-fill"></i><span>Secure<br>Chat &amp; Calls</span></article>
                                    <article><i class="bi bi-lock-fill"></i><span>Safe<br>Payments</span></article>
                                    <article><i class="bi bi-geo-alt-fill"></i><span>Local to<br>You</span></article>
                                </div>
                            </div>

                            <form id="login-form" class="client-login-form">
                                <div class="login-heading">
                                    <h1>Welcome back!</h1>
                                    <p>Log in to your KAILA account</p>
                                </div>

                                <label>Username
                                    <span class="login-field"><i class="bi bi-person"></i><input name="username" required autocomplete="username" placeholder="Enter your username"></span>
                                </label>
                                <label>Password
                                    <span class="login-field"><i class="bi bi-lock"></i><input name="password" type="password" required autocomplete="current-password" placeholder="Enter your password"><button class="password-toggle" type="button" data-password-toggle aria-label="Show password" title="Show password"><i class="bi bi-eye-slash"></i></button></span>
                                </label>

                                <div class="login-options">
                                    <label class="login-check"><input type="checkbox" name="remember" value="1" checked><span>Remember me</span></label>
                                    <a href="/support">Forgot password?</a>
                                </div>

                                <button class="landing-primary login-submit" type="submit">Login <i class="bi bi-arrow-right"></i></button>

                                <div class="login-divider"><span>or continue with</span></div>
                                <div class="login-socials" data-social-auth>
                                    <button class="social-button" type="button" data-social-provider="google" data-social-mode="login"><i class="bi bi-google"></i><span class="desktop-only"></span>Google</button>
                                    <button class="social-button" type="button" data-social-provider="facebook" data-social-mode="login"><i class="bi bi-facebook"></i><span class="desktop-only"></span>Facebook</button>
                                </div>

                                <div class="offline-note">
                                    <span><i class="bi bi-cloud-check"></i></span>
                                    <p><b>You're offline, but we've got you.</b><br>You can still access your recent data. Some features may be limited until you're back online.</p>
                                    <em><i class="bi bi-wifi"></i> Offline</em>
                                </div>

                                <p class="login-safe"><i class="bi bi-lock"></i>Your data is safe and encrypted.</p>
                                <p class="login-create">New to KAILA? <a href="/register">Create an account</a></p>
                                <p class="form-note" data-auth-message></p>
                            </form>
                        </main>
                    </div>
                    <footer class="login-footer desktop-only">
                        <p>By continuing, you agree to KAILA's <a href="/terms">Terms of Service</a> and <a href="/privacy-policy">Privacy Policy</a>.</p>
                        <p>&copy; 2025 KAILA. All rights reserved.</p>
                    </footer>
                </section>
                @elseif (request()->is('register'))
                <section class="client-register-page {{ request('role') === 'provider' ? 'is-provider-register' : '' }}">
                    <header class="register-topbar">
                        <a class="register-back mobile-only" href="/" aria-label="Back" data-history-back><i class="bi bi-chevron-left"></i></a>
                        <a class="landing-logo" href="/"><img src="/assets/brand/kaila-logo.png" alt="KAILA"></a>
                        <div class="register-login desktop-only">
                            <span>Already have an account?</span>
                            <a class="landing-login" href="/login">Login</a>
                        </div>
                    </header>

                    <div class="client-register-layout">
                        <aside class="register-side desktop-only">
                            <h1>Join KAILA<br>and get things<br>done.</h1>
                            <p>Create your account to post requests, receive offers, chat with providers, and track your jobs with ease.</p>
                            <img src="/assets/registration/client-registration-illustration.png" alt="" aria-hidden="true">
                            <div class="register-benefits">
                                <article><span class="feature-icon shield"><i class="bi bi-shield-check"></i></span><p><b>Trusted local professionals</b><br>All providers are verified and reviewed by clients.</p></article>
                                <article><span class="feature-icon chat"><i class="bi bi-chat-square-text"></i></span><p><b>Compare and choose</b><br>Review offers, ratings, and prices before hiring.</p></article>
                                <article><span class="feature-icon scales"><i class="bi bi-telephone"></i></span><p><b>Chat, call, and track</b><br>Communicate easily and track job progress in real time.</p></article>
                                <article><span class="feature-icon pin"><i class="bi bi-geo-alt"></i></span><p><b>Built for your area</b><br>Local service marketplace made for you.</p></article>
                            </div>
                        </aside>

                        <main class="register-panel">
                            <div class="register-heading">
                                <a class="landing-logo mobile-only" href="/"><img src="/assets/brand/kaila-logo.png" alt="KAILA"></a>
                                <h1 data-register-title>Create Account (Client)</h1>
                                <p data-register-subtitle>Join KAILA and get things done.</p>
                            </div>

                            <form id="register-form" class="client-register-form" data-register-form data-step="1" data-register-role="{{ request('role') === 'provider' ? 'provider' : 'client' }}">
                                <input type="hidden" name="role" value="{{ request('role') === 'provider' ? 'provider' : 'client' }}">
                                <input type="hidden" name="category" value="General local service" @disabled(request('role') === 'provider')>

                                <div class="register-steps client-register-steps" aria-label="Registration progress" data-client-register>
                                    <span class="step is-active" data-step-indicator="1"><b>1</b>Account &amp; Contact</span>
                                    <i></i>
                                    <span class="step" data-step-indicator="2"><b>2</b>Location &amp; Consent</span>
                                </div>

                                <section class="register-section" data-step-section="1" data-client-register>
                                    <h2><i class="bi bi-person"></i>Account Details</h2>
                                    <div class="name-parts-grid">
                                        <div class="register-field"><i class="bi bi-person"></i><label>First name<input name="first_name" required autocomplete="given-name" placeholder="e.g. Juan"></label></div>
                                        <div class="register-field"><i class="bi bi-person"></i><label>Middle name <span>(optional)</span><input name="middle_name" autocomplete="additional-name" placeholder="e.g. Santos"></label></div>
                                        <div class="register-field"><i class="bi bi-person"></i><label>Last name<input name="last_name" required autocomplete="family-name" placeholder="e.g. Dela Cruz"></label></div>
                                        <div class="register-field"><i class="bi bi-person"></i><label>Suffix <span>(optional)</span><input name="suffix" autocomplete="honorific-suffix" placeholder="e.g. Jr."></label></div>
                                    </div>
                                    <div class="register-field"><i class="bi bi-envelope"></i><label>Email address<input name="email" type="email" autocomplete="email" placeholder="e.g. juan@email.com"></label></div>
                                    <div class="register-field"><i class="bi bi-person-circle"></i><label>Username<input name="username" required minlength="3" autocomplete="username" placeholder="e.g. juandelacruz"></label></div>
                                    <div class="register-field"><i class="bi bi-lock"></i><label>Password<input name="password" type="password" required minlength="8" autocomplete="new-password" placeholder="Create a strong password"></label><button class="password-toggle" type="button" data-password-toggle aria-label="Show password" title="Show password"><i class="bi bi-eye-slash"></i></button></div>
                                    <p class="password-hint"><span></span>At least 8 characters with letters and numbers</p>

                                    <h2><i class="bi bi-telephone-fill"></i>Contact Details</h2>
                                    <div class="register-field"><i class="bi bi-telephone"></i><label>Contact number<input name="contact_number" inputmode="tel" required placeholder="09XX XXX XXXX"></label></div>
                                    <div class="register-field"><i class="bi bi-link-45deg"></i><label>Messenger / Social link (optional)<input name="messenger_link" placeholder="e.g. facebook.com/juandelacruz"></label></div>
                                    <input type="hidden" name="preferred_contact_channel" value="Call" required>
                                    <div class="contact-choice-grid" aria-label="Preferred contact channel options">
                                        <label class="choice-card is-selected"><input type="radio" name="contact_channel_card" value="Call" checked><i class="bi bi-telephone-fill"></i><span>Call</span></label>
                                        <label class="choice-card"><input type="radio" name="contact_channel_card" value="SMS"><i class="bi bi-chat-square-dots"></i><span>SMS</span></label>
                                        <label class="choice-card"><input type="radio" name="contact_channel_card" value="Messenger"><i class="bi bi-messenger"></i><span>Messenger</span></label>
                                        <label class="choice-card"><input type="radio" name="contact_channel_card" value="Email"><i class="bi bi-envelope"></i><span>Email</span></label>
                                    </div>
                                    <input type="hidden" name="best_contact_time" value="Weekdays, 9:00 AM - 6:00 PM">
                                    <div class="time-chip-group" aria-label="Best time to contact you">
                                        <p>Best time to contact you</p>
                                        <label class="time-chip is-selected"><input type="radio" name="best_contact_time_choice" value="Weekdays, 9:00 AM - 6:00 PM" checked>Weekdays</label>
                                        <label class="time-chip"><input type="radio" name="best_contact_time_choice" value="Weeknights, 6:00 PM - 9:00 PM">Evenings</label>
                                        <label class="time-chip"><input type="radio" name="best_contact_time_choice" value="Weekends, 9:00 AM - 6:00 PM">Weekends</label>
                                        <label class="time-chip"><input type="radio" name="best_contact_time_choice" value="Any time">Any time</label>
                                    </div>
                                    <button class="register-next mobile-only" type="button" data-register-next>Continue <i class="bi bi-arrow-right"></i></button>
                                    <div class="register-mobile-social mobile-only" data-social-auth>
                                        <span>or sign up with</span>
                                        <button class="social-button" type="button" data-social-provider="google" data-social-mode="signup"><i class="bi bi-google"></i>Google</button>
                                        <button class="social-button" type="button" data-social-provider="facebook" data-social-mode="signup"><i class="bi bi-facebook"></i>Facebook</button>
                                        <p>Already have an account? <a href="/login">Login</a></p>
                                    </div>
                                </section>

                                <section class="register-section" data-step-section="2" data-client-register>
                                    <h2><i class="bi bi-geo-alt-fill"></i>Location</h2>
                                    <div class="register-field"><i class="bi bi-geo-alt"></i><label>Region<select name="region" data-address-region></select></label><i class="bi bi-chevron-down"></i></div>
                                    <div class="register-field"><i class="bi bi-shield-check"></i><label>Province<select name="province" data-address-province></select></label><i class="bi bi-chevron-down"></i></div>
                                    <div class="register-field"><i class="bi bi-buildings"></i><label>City / Municipality<select name="city" data-address-city></select></label><i class="bi bi-chevron-down"></i></div>
                                    <div class="register-field"><i class="bi bi-geo"></i><label>Barangay<select required data-address-barangay><option value="">Select barangay</option></select></label><i class="bi bi-chevron-down"></i></div>
                                    <input type="hidden" name="area" required data-address-area>
                                    <div class="register-field"><i class="bi bi-house"></i><label>Detailed address <span>(optional)</span><input name="detailed_address" placeholder="House no., Street, Subdivision, Building, etc."></label></div>

                                    <h2><i class="bi bi-people-fill"></i>Role</h2>
                                    <p class="section-note">Select your role on KAILA</p>
                                    <div class="role-card-grid">
                                        <label class="role-card is-selected"><input type="radio" name="role_preview" value="client" checked><i class="bi bi-person-fill"></i><b>Client</b><span>I need to hire a service provider</span></label>
                                        <label class="role-card"><input type="radio" name="role_preview" value="provider"><i class="bi bi-person-workspace"></i><b>Provider</b><span>I provide services to customers</span></label>
                                    </div>

                                    <h2><i class="bi bi-shield-check"></i>Consent &amp; Agreements</h2>
                                    <label class="register-check"><input type="checkbox" name="terms_consent" value="1" required checked><span>I agree to KAILA's <a href="/terms">Terms of Service</a> and <a href="/privacy-policy">Privacy Policy</a>.</span></label>
                                    <label class="register-check"><input type="checkbox" name="data_privacy_consent" value="1" required checked><span>I consent to the collection and processing of my personal data in accordance with the Privacy Act of 2012.</span></label>
                                    <div class="privacy-note"><i class="bi bi-lock"></i><p><b>Your privacy matters</b><br>We use your information only to provide and improve our services. We never sell your data.</p></div>
                                </section>

                                <section class="provider-register-shell" data-provider-register hidden>
                                    <input type="hidden" name="category" value="Plumbing" disabled>
                                    <input type="hidden" name="specific_services" value="Faucet Repair, Pipe Installation, Leak Detection, Drain Cleaning" disabled>
                                    <input type="hidden" name="coverage_area" value="Makati City, Taguig, Pasig" disabled>
                                    <input type="hidden" name="availability" value="Available" disabled>

                                    <div class="provider-stepper" aria-label="Provider registration progress">
                                        <span class="is-active"><b><i class="bi bi-person"></i></b>Profile</span>
                                        <i></i>
                                        <span><b><i class="bi bi-tools"></i></b>Services</span>
                                        <i></i>
                                        <span><b><i class="bi bi-calendar-check"></i></b>Availability</span>
                                        <i></i>
                                        <span><b><i class="bi bi-shield-check"></i></b>Verification</span>
                                        <i></i>
                                        <span><b><i class="bi bi-check-lg"></i></b>Agreements</span>
                                    </div>

                                    <div class="provider-register-layout">
                                        <div class="provider-register-main">
                                            <section class="provider-step-content" data-provider-step-section="1">
                                            <div class="provider-page-title">
                                                <h2>Create your provider account</h2>
                                                <p>Tell us about yourself so clients can find and trust you.</p>
                                            </div>

                                            <div class="provider-form-card">
                                                <h3>Personal Information</h3>
                                                <div class="provider-grid">
                                                    <div class="register-field"><i class="bi bi-person"></i><label>First name<input name="first_name" required autocomplete="given-name" placeholder="Juan" disabled></label></div>
                                                    <div class="register-field"><i class="bi bi-person"></i><label>Middle name <span>(optional)</span><input name="middle_name" autocomplete="additional-name" placeholder="Santos" disabled></label></div>
                                                    <div class="register-field"><i class="bi bi-person"></i><label>Last name<input name="last_name" required autocomplete="family-name" placeholder="Dela Cruz" disabled></label></div>
                                                    <div class="register-field"><i class="bi bi-person"></i><label>Suffix <span>(optional)</span><input name="suffix" autocomplete="honorific-suffix" placeholder="Jr." disabled></label></div>
                                                    <div class="register-field"><i class="bi bi-envelope"></i><label>Email address<input name="email" type="email" autocomplete="email" placeholder="juan@email.com" disabled></label></div>
                                                    <div class="register-field"><i class="bi bi-person-circle"></i><label>Username<input name="username" required minlength="3" autocomplete="username" placeholder="e.g., juandelacruz_ph" disabled></label></div>
                                                    <div class="register-field"><i class="bi bi-telephone"></i><label>Contact number<input name="contact_number" inputmode="tel" required placeholder="+63 912 345 6789" disabled></label></div>
                                                    <div class="register-field"><i class="bi bi-lock"></i><label>Password<input name="password" type="password" required minlength="8" autocomplete="new-password" placeholder="Create a strong password" disabled></label></div>
                                                    <div class="register-field"><i class="bi bi-messenger"></i><label>Messenger / Social link <span>(optional)</span><input name="messenger_link" placeholder="m.me/juandecruz" disabled></label></div>
                                                    <div class="register-field"><i class="bi bi-chat-left-dots"></i><label>Preferred contact channel<select name="preferred_contact_channel" required disabled><option value="">Select channel</option><option>Call</option><option>SMS</option><option>Messenger</option><option>Email</option></select></label><i class="bi bi-chevron-down"></i></div>
                                                    <div class="register-field"><i class="bi bi-clock"></i><label>Best contact time<select name="best_contact_time" disabled><option value="">Select time</option><option>Weekdays, 9:00 AM - 6:00 PM</option><option>Weeknights, 6:00 PM - 9:00 PM</option><option>Weekends, 9:00 AM - 6:00 PM</option><option>Any time</option></select></label><i class="bi bi-chevron-down"></i></div>
                                                    <div class="register-field"><i class="bi bi-geo-alt"></i><label>Address / Area<input name="area" required placeholder="Makati City, Metro Manila" disabled></label></div>
                                                </div>
                                            </div>

                                            <div class="provider-form-card">
                                                <h3>Provider Details</h3>
                                                <div class="provider-grid provider-details-grid">
                                                    <div class="register-field"><i class="bi bi-person-badge"></i><label>Provider type<select name="provider_type" required disabled><option>Individual</option><option>Freelancer</option><option>Shop</option><option>Small team</option><option>Business</option></select></label><i class="bi bi-chevron-down"></i></div>
                                                    <div class="register-field"><i class="bi bi-award"></i><label>Years of experience<select name="years_experience" required disabled><option>Less than 1 year</option><option>1-2 years</option><option selected>5+ years</option><option>10+ years</option></select></label><i class="bi bi-chevron-down"></i></div>
                                                    <div class="register-field"><i class="bi bi-cash"></i><label>Minimum fee (PHP)<input name="minimum_fee" inputmode="numeric" placeholder="e.g., 500" disabled></label></div>
                                                    <div class="provider-toggle-field">
                                                        <span>Emergency availability</span>
                                                        <small>Available for urgent / emergency jobs</small>
                                                        <div class="provider-segment">
                                                            <label><input type="radio" name="emergency_availability" value="Yes" checked disabled><span>Yes</span></label>
                                                            <label><input type="radio" name="emergency_availability" value="No" disabled><span>No</span></label>
                                                        </div>
                                                    </div>
                                                    <div class="register-field"><i class="bi bi-tag"></i><label>Price range (PHP)<select name="price_range" disabled><option>500 - 5,000</option><option>1,000 - 10,000</option><option>Custom quote</option></select></label><i class="bi bi-chevron-down"></i></div>
                                                    <div class="provider-summary-note wide"><i class="bi bi-info-circle"></i><span>Services, coverage, schedule, and verification are collected in the next steps.</span></div>
                                                </div>
                                            </div>
                                            </section>

                                            <section class="provider-step-content" data-provider-step-section="2" hidden>
                                                <a class="provider-back-link" href="#" data-provider-prev><i class="bi bi-chevron-left"></i>Back</a>
                                                <div class="provider-page-title"><h2>Services</h2><p>Tell clients what services you offer.</p></div>
                                                <div class="provider-form-card">
                                                    <h3>1. Select your service categories</h3>
                                                    <p class="provider-card-note">Choose all categories that match the services you provide.</p>
                                                    <div class="provider-service-grid">
                                                        <label class="provider-service-card is-selected"><input type="checkbox" checked><i class="bi bi-water"></i><span>Plumbing</span><b><i class="bi bi-check"></i></b></label>
                                                        <label class="provider-service-card is-selected"><input type="checkbox" checked><i class="bi bi-lightning-charge-fill"></i><span>Electrical</span><b><i class="bi bi-check"></i></b></label>
                                                        <label class="provider-service-card is-selected"><input type="checkbox" checked><i class="bi bi-bucket"></i><span>Cleaning</span><b><i class="bi bi-check"></i></b></label>
                                                        <label class="provider-service-card is-selected"><input type="checkbox" checked><i class="bi bi-tools"></i><span>Repair &amp; Handyman</span><b><i class="bi bi-check"></i></b></label>
                                                        <label class="provider-service-card"><input type="checkbox"><i class="bi bi-paint-bucket"></i><span>Painting</span><b><i class="bi bi-check"></i></b></label>
                                                        <label class="provider-service-card"><input type="checkbox"><i class="bi bi-hammer"></i><span>Carpentry</span><b><i class="bi bi-check"></i></b></label>
                                                        <label class="provider-service-card"><input type="checkbox"><i class="bi bi-window"></i><span>Appliance Repair</span><b><i class="bi bi-check"></i></b></label>
                                                        <label class="provider-service-card"><input type="checkbox"><i class="bi bi-truck"></i><span>Moving &amp; Hauling</span><b><i class="bi bi-check"></i></b></label>
                                                        <label class="provider-service-card"><input type="checkbox"><i class="bi bi-bug"></i><span>Pest Control</span><b><i class="bi bi-check"></i></b></label>
                                                        <label class="provider-service-card"><input type="checkbox"><i class="bi bi-snow"></i><span>Aircon Services</span><b><i class="bi bi-check"></i></b></label>
                                                        <label class="provider-service-card"><input type="checkbox"><i class="bi bi-three-dots"></i><span>Other</span><b><i class="bi bi-check"></i></b></label>
                                                    </div>
                                                    <p class="provider-selected-count">Selected <b>4 categories</b></p>
                                                </div>
                                                <div class="provider-form-card">
                                                    <h3>2. Specify the services you offer</h3>
                                                    <p class="provider-card-note">Add the specific services you can do.</p>
                                                    <div class="provider-chip-input">
                                                        <span>Faucet Repair <i class="bi bi-x"></i></span>
                                                        <span>Pipe Installation <i class="bi bi-x"></i></span>
                                                        <span>Leak Detection <i class="bi bi-x"></i></span>
                                                        <span>Drain Cleaning <i class="bi bi-x"></i></span>
                                                        <i class="bi bi-chevron-down"></i>
                                                    </div>
                                                    <button class="provider-link-button" type="button"><i class="bi bi-plus-lg"></i>Add another service</button>
                                                    <div class="provider-tip"><i class="bi bi-lightbulb"></i>Tip: Be specific! Listing more services helps clients find you for more jobs.</div>
                                                </div>
                                            </section>

                                            <section class="provider-step-content" data-provider-step-section="3" hidden>
                                                <a class="provider-back-link" href="#" data-provider-prev><i class="bi bi-chevron-left"></i>Back</a>
                                                <div class="provider-page-title"><h2>Availability</h2><p>Set your schedule so clients know when you're available.</p></div>
                                                <div class="provider-form-card">
                                                    <h3><i class="bi bi-calendar3"></i>1. Available days</h3>
                                                    <p class="provider-card-note">Choose the days you're available to work.</p>
                                                    <div class="provider-day-grid">
                                                        @foreach (['Mon','Tue','Wed','Thu','Fri','Sat'] as $day)
                                                            <label class="provider-day is-selected"><input type="checkbox" checked><span>{{ $day }}</span><i class="bi bi-check-circle-fill"></i></label>
                                                        @endforeach
                                                        <label class="provider-day"><input type="checkbox"><span>Sun</span><i class="bi bi-circle"></i></label>
                                                    </div>
                                                </div>
                                                <div class="provider-form-card">
                                                    <h3><i class="bi bi-clock"></i>2. Available time</h3>
                                                    <p class="provider-card-note">Set your daily working hours.</p>
                                                    <div class="provider-time-grid">
                                                        <div class="register-field"><i class="bi bi-clock"></i><label>Start time<select><option>7:00 AM</option><option>8:00 AM</option><option>9:00 AM</option></select></label><i class="bi bi-chevron-down"></i></div>
                                                        <div class="register-field"><i class="bi bi-clock"></i><label>End time<select><option>7:00 PM</option><option>6:00 PM</option><option>5:00 PM</option></select></label><i class="bi bi-chevron-down"></i></div>
                                                        <div class="provider-hours-card"><i class="bi bi-clock"></i><b>12 hours per day</b><span>Total available time</span></div>
                                                    </div>
                                                </div>
                                                <div class="provider-form-card">
                                                    <h3><i class="bi bi-person-check"></i>3. Availability options</h3>
                                                    <div class="provider-option-row"><label class="provider-switch"><input type="checkbox" checked><span></span></label><div><b>Accept urgent / emergency jobs</b><p>Get more jobs by accepting urgent requests.</p></div><em>Recommended</em><strong>Higher visibility</strong></div>
                                                    <div class="provider-option-row"><label class="provider-switch"><input type="checkbox"><span></span></label><div><b>Available on holidays</b><p>Turn on to get more job opportunities.</p></div><strong>More bookings</strong></div>
                                                </div>
                                                <div class="provider-two-column">
                                                    <div class="provider-form-card">
                                                        <h3><i class="bi bi-geo-alt"></i>4. Travel / Distance</h3>
                                                        <p class="provider-card-note">Maximum distance you're willing to travel.</p>
                                                        <div class="register-field"><i class="bi bi-car-front"></i><label><select disabled><option>Up to 10 km</option><option>Up to 20 km</option><option>Metro-wide</option></select></label><i class="bi bi-chevron-down"></i></div>
                                                        <div class="provider-tip small"><i class="bi bi-shield-check"></i>You can update this anytime in your settings.</div>
                                                    </div>
                                                    <div class="provider-form-card">
                                                        <h3><i class="bi bi-arrow-repeat"></i>5. Time flexibility (optional)</h3>
                                                        <p class="provider-card-note">How flexible is your schedule?</p>
                                                        <div class="provider-flex-grid">
                                                            <button type="button">Strict<span>Fixed hours</span></button>
                                                            <button type="button" class="is-selected">Somewhat flexible<span>Can adjust</span></button>
                                                            <button type="button">Very flexible<span>Open anytime</span></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </section>

                                            <section class="provider-step-content" data-provider-step-section="4" hidden>
                                                <a class="provider-back-link" href="#" data-provider-prev><i class="bi bi-chevron-left"></i>Back</a>
                                                <div class="provider-page-title"><h2>Verification</h2><p>Help clients trust you by verifying your identity and qualifications.</p></div>
                                                <div class="provider-form-card">
                                                    <h3><i class="bi bi-shield-check"></i>1. Identity Verification (Optional but recommended)</h3>
                                                    <p class="provider-card-note">Upload a valid government-issued ID. Your information is securely protected.</p>
                                                    <div class="provider-upload-grid">
                                                        <div class="register-field"><i class="bi bi-card-heading"></i><label>Select ID type<select><option>National ID</option><option>Driver's License</option><option>Passport</option></select></label><i class="bi bi-chevron-down"></i></div>
                                                        <button class="provider-upload-tile" type="button"><i class="bi bi-upload"></i><b>Upload front photo</b><span>JPG, PNG or PDF (Max. 5MB)</span></button>
                                                        <div class="provider-safe-card"><i class="bi bi-lock"></i><b>Your data is safe</b><span>We use bank-level encryption to protect your identity.</span></div>
                                                    </div>
                                                </div>
                                                <div class="provider-form-card">
                                                    <h3><i class="bi bi-patch-check"></i>2. Certificates / Permits (If applicable)</h3>
                                                    <p class="provider-card-note">Upload any certificates, licenses, or permits that prove your skills.</p>
                                                    <div class="provider-upload-grid certificates">
                                                        <button class="provider-upload-tile" type="button"><i class="bi bi-upload"></i><b>Upload file or add link</b><span>JPG, PNG, PDF or Link (Max. 10MB)</span></button>
                                                        <div class="provider-file-list">
                                                            <b>Uploaded files (2)</b>
                                                            <span><i class="bi bi-filetype-pdf"></i>TESDA NC II - Plumbing.pdf<em>1.2 MB</em><button type="button"><i class="bi bi-trash"></i></button></span>
                                                            <span><i class="bi bi-file-earmark-image"></i>City Business Permit 2024.jpg<em>1.8 MB</em><button type="button"><i class="bi bi-trash"></i></button></span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="provider-form-card">
                                                    <h3><i class="bi bi-images"></i>3. Work Sample (Show your best work)</h3>
                                                    <p class="provider-card-note">Add photos, videos, or links to your previous projects.</p>
                                                    <div class="provider-sample-grid">
                                                        <div><img src="/assets/landing/hero-desktop.png" alt=""><button type="button"><i class="bi bi-x"></i></button></div>
                                                        <div><img src="/assets/landing/phone-mock.png" alt=""><button type="button"><i class="bi bi-x"></i></button></div>
                                                        <div><img src="/assets/login/login-local-road.png" alt=""><button type="button"><i class="bi bi-x"></i></button></div>
                                                        <button type="button"><i class="bi bi-plus-circle"></i><b>Add more</b><span>Photos / Videos</span></button>
                                                    </div>
                                                    <div class="register-field wide"><i class="bi bi-link-45deg"></i><label>Portfolio link <span>(optional)</span><input name="portfolio_link" placeholder="https://yourportfolio.com"></label></div>
                                                    <p class="provider-card-note">Add a link to your online portfolio or social media page.</p>
                                                </div>
                                            </section>

                                            <section class="provider-step-content" data-provider-step-section="5" hidden>
                                                <a class="provider-back-link" href="#" data-provider-prev><i class="bi bi-chevron-left"></i>Back</a>
                                                <div class="provider-page-title"><h2>Agreements</h2><p>Review and agree to our terms to complete your provider registration.</p></div>
                                                <div class="provider-form-card">
                                                    <h3><i class="bi bi-clipboard-check"></i>1. Consents</h3>
                                                    <p class="provider-card-note">Help us personalize your experience and keep your information secure.</p>
                                                    <div class="provider-agreement-list">
                                                        <label><input type="checkbox" checked><i class="bi bi-briefcase"></i><span><b>I consent to receive job requests</b>Allow KAILA to send me job opportunities that match my profile, services, and availability.</span></label>
                                                        <label><input type="checkbox" checked><i class="bi bi-star"></i><span><b>I agree to receive ratings and reviews</b>Allow clients to rate and review my work. This helps build trust in the community.</span></label>
                                                        <label><input type="checkbox" name="data_privacy_consent" value="1" checked disabled><i class="bi bi-lock"></i><span><b>I agree to KAILA's Data Privacy Policy</b>Your data is handled securely and will never be shared without your permission.</span><a href="/privacy-policy">View policy <i class="bi bi-box-arrow-up-right"></i></a></label>
                                                        <label><input type="checkbox" checked><i class="bi bi-bell"></i><span><b>I agree to receive important updates</b>Get notified about bookings, payments, promotions, and platform updates.</span></label>
                                                    </div>
                                                </div>
                                                <div class="provider-form-card">
                                                    <h3><i class="bi bi-journal-check"></i>2. Agreements</h3>
                                                    <p class="provider-card-note">Please read and agree to the following before you join.</p>
                                                    <div class="provider-agreement-list compact">
                                                        <label><input type="checkbox" name="rules_agreement" value="1" checked disabled><i class="bi bi-file-earmark-text"></i><span><b>I have read and agree to the Provider Terms &amp; Conditions</b>These terms outline your rights and responsibilities as a KAILA provider.</span><a href="/terms">Read terms <i class="bi bi-box-arrow-up-right"></i></a></label>
                                                        <label><input type="checkbox" checked><i class="bi bi-file-earmark-text"></i><span><b>I agree to follow the KAILA Community Guidelines</b>Be respectful, professional, and deliver quality service to clients.</span><a href="/terms">Read guidelines <i class="bi bi-box-arrow-up-right"></i></a></label>
                                                        <label><input type="checkbox" checked><i class="bi bi-file-earmark-text"></i><span><b>I agree to the KAILA Fees and Payments Policy</b>Understand how our fees, payouts, and payment protection work.</span><a href="/terms">Read policy <i class="bi bi-box-arrow-up-right"></i></a></label>
                                                    </div>
                                                    <div class="provider-ready"><i class="bi bi-shield-check"></i><p><b>You're almost ready!</b><br>By continuing, you confirm that all information provided is accurate and complete.</p></div>
                                                </div>
                                            </section>
                                        </div>

                                        <aside class="provider-preview-panel">
                                            <div class="provider-preview-card">
                                                <h3>Your provider preview</h3>
                                                <p>This is how clients will see you.</p>
                                                <div class="preview-profile">
                                                    <img src="/assets/registration/client-registration-illustration.png" alt="">
                                                    <div>
                                                        <b data-provider-preview-name>Juan Dela Cruz</b>
                                                        <span>Top Pro</span>
                                                        <small><i class="bi bi-star-fill"></i> 4.9 (128 reviews)</small>
                                                        <small><i class="bi bi-geo-alt"></i> Makati City, Metro Manila</small>
                                                        <small><i class="bi bi-briefcase"></i> 5+ years experience</small>
                                                    </div>
                                                    <button type="button"><i class="bi bi-pencil"></i>Edit</button>
                                                </div>
                                                <div class="preview-services">
                                                    <strong>Services</strong><a href="#">View all <i class="bi bi-chevron-right"></i></a>
                                                    <span>Plumbing</span><span>Electrical</span><span>Repair</span><span>+2</span>
                                                </div>
                                                <dl>
                                                    <div><dt><i class="bi bi-stopwatch"></i>Response time</dt><dd>Usually within 30 mins</dd></div>
                                                    <div><dt><i class="bi bi-chat-dots"></i>Preferred contact</dt><dd>Messenger</dd></div>
                                                    <div><dt><i class="bi bi-calendar-check"></i>Availability</dt><dd>Mon - Sun, 7:00 AM - 7:00 PM</dd></div>
                                                    <div><dt><i class="bi bi-geo-alt"></i>Coverage area</dt><dd>Makati City, Taguig, Pasig +2 more</dd></div>
                                                    <div><dt><i class="bi bi-cash-coin"></i>Starting price</dt><dd>From PHP 500</dd></div>
                                                </dl>
                                            </div>
                                            <div class="provider-trust-copy">
                                                <h3><i class="bi bi-shield-check"></i>Why we ask for these details</h3>
                                                <p>This helps clients feel confident that you're qualified, reachable, and ready to help.</p>
                                                <span><i class="bi bi-patch-check"></i>Verified providers get more jobs</span>
                                                <span><i class="bi bi-heart"></i>Higher trust = more confirmed bookings</span>
                                                <span><i class="bi bi-lock"></i>Your data is safe with us</span>
                                            </div>
                                        </aside>
                                    </div>

                                </section>

                                <div class="register-submitbar">
                                    <button class="landing-primary" type="submit">Create Account <i class="bi bi-arrow-right desktop-only"></i></button>
                                    <span>or sign up with</span>
                                    <button class="social-button" type="button" data-social-provider="google" data-social-mode="signup"><i class="bi bi-google"></i>Google</button>
                                    <button class="social-button" type="button" data-social-provider="facebook" data-social-mode="signup"><i class="bi bi-facebook"></i>Facebook</button>
                                </div>
                                <p class="register-bottom-login mobile-only">Already have an account? <a href="/login">Login</a></p>
                                <p class="form-note" data-auth-message></p>
                            </form>
                        </main>
                    </div>
                </section>
                @else
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
                @endif
            @else
                @include('client')
                @if(false)
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
                @endif
            @endguest
        </main>

        @auth
            @if(false)
            <nav class="bottom-nav" aria-label="Mobile navigation">
                <button class="active" data-tab="home">Home</button>
                <button data-tab="jobs">Jobs</button>
                <button data-tab="post">Post</button>
                <button data-tab="messages">Chat</button>
                <button data-tab="settings">Me</button>
            </nav>
            @endif
        @endauth
    </div>
    <div class="toast-host" data-toasts></div>
</body>
</html>
