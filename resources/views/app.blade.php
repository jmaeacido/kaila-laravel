<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="theme-color" content="#06b6d4">
    <title>KAILA</title>
    <link rel="manifest" href="/manifest.webmanifest">
    <link rel="icon" href="/assets/brand/kaila-app-icon.png">
    @guest
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    @endguest
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
    <div id="app" class="app-shell @guest guest-shell @endguest">
        @auth
        <aside class="rail">
            <a class="brand" href="{{ auth()->check() ? '/home' : '/' }}">
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
        @endauth

        <main class="main">
            @auth
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
            @endauth

            @guest
                @php
                    $legalPages = [
                        'privacy-policy' => [
                            'label' => 'Privacy Policy',
                            'eyebrow' => 'Privacy',
                            'title' => 'Privacy Policy',
                            'lede' => 'KAILA protects the account, request, message, and service details needed to connect clients with local providers.',
                            'items' => [
                                ['What we collect', 'Account details, contact information, service requests, messages, ratings, location-related job details, device data, and payment-status information when needed to operate the service.'],
                                ['How we use it', 'We use information to match requests with providers, keep conversations and job updates available, improve safety, prevent abuse, and maintain the KAILA platform.'],
                                ['Your choices', 'You can update your profile, control what you share in requests and messages, and contact support for account or data questions.'],
                            ],
                        ],
                        'terms' => [
                            'label' => 'Terms',
                            'eyebrow' => 'Terms',
                            'title' => 'Terms of Service',
                            'lede' => 'These terms outline the basic expectations for using KAILA to request, offer, manage, and complete local service work.',
                            'items' => [
                                ['Using KAILA', 'Clients and providers are responsible for keeping account details accurate, communicating respectfully, and using the platform for legitimate local service needs.'],
                                ['Jobs and payments', 'Requests, offers, accepted work, completion checks, ratings, and payment arrangements must reflect the actual service agreed by both sides.'],
                                ['Safety and conduct', 'KAILA may limit, suspend, or remove accounts, requests, messages, or content that appear unsafe, fraudulent, abusive, or outside platform rules.'],
                            ],
                        ],
                        'support' => [
                            'label' => 'Contact Support',
                            'eyebrow' => 'Support',
                            'title' => 'Contact Support',
                            'lede' => 'Need help with your account, a request, a provider, or a safety concern? KAILA support can help route the issue.',
                            'items' => [
                                ['Account help', 'For login, registration, profile, or notification issues, include the email or phone number linked to your account.'],
                                ['Job support', 'For active requests, include the service type, provider or client name, and a short description of what happened.'],
                                ['Safety concerns', 'For urgent safety or fraud concerns, send the details as soon as possible and avoid sharing sensitive payment information in plain text.'],
                            ],
                            'action' => ['mailto:support@kaila-app.com', 'Email support@kaila-app.com'],
                        ],
                    ];
                    $pageKey = trim(request()->path(), '/');
                    $legalPage = $legalPages[$pageKey] ?? null;
                @endphp

                @if (request()->is('/'))
                    <section class="landing-page">
                        <header class="landing-header">
                            <a class="landing-logo" href="/">
                                <img src="/assets/brand/kaila-wordmark.png" alt="KAILA">
                            </a>
                            <nav class="landing-links" aria-label="Landing navigation">
                                <a href="#how-it-works">How It Works</a>
                                <a href="#for-providers">For Providers</a>
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
                                <img src="/assets/brand/kaila-wordmark.png" alt="KAILA">
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
                            <a class="legal-back" href="/"><i class="bi bi-arrow-left" aria-hidden="true"></i>Back to KAILA</a>
                            <p class="legal-eyebrow">{{ $legalPage['eyebrow'] }}</p>
                            <h1>{{ $legalPage['title'] }}</h1>
                            <p class="legal-lede">{{ $legalPage['lede'] }}</p>

                            <div class="legal-grid">
                                @foreach ($legalPage['items'] as [$heading, $body])
                                    <article>
                                        <h2>{{ $heading }}</h2>
                                        <p>{{ $body }}</p>
                                    </article>
                                @endforeach
                            </div>

                            @isset($legalPage['action'])
                                <a class="landing-primary legal-action" href="{{ $legalPage['action'][0] }}">
                                    <i class="bi bi-headset" aria-hidden="true"></i>
                                    {{ $legalPage['action'][1] }}
                                    <i class="bi bi-arrow-right" aria-hidden="true"></i>
                                </a>
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
                                <a class="landing-logo" href="/"><img src="/assets/brand/kaila-wordmark.png" alt="KAILA"></a>
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
                                <a class="landing-logo" href="/"><img src="/assets/brand/kaila-wordmark.png" alt="KAILA"></a>
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
                <section class="client-register-page">
                    <header class="register-topbar">
                        <a class="register-back mobile-only" href="/" aria-label="Back"><i class="bi bi-chevron-left"></i></a>
                        <a class="landing-logo" href="/"><img src="/assets/brand/kaila-wordmark.png" alt="KAILA"></a>
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
                                <a class="landing-logo mobile-only" href="/"><img src="/assets/brand/kaila-wordmark.png" alt="KAILA"></a>
                                <h1>Create Account (Client)</h1>
                                <p>Join KAILA and get things done.</p>
                            </div>

                            <form id="register-form" class="client-register-form" data-register-form data-step="1">
                                <input type="hidden" name="role" value="client">
                                <input type="hidden" name="category" value="General local service">

                                <div class="register-steps" aria-label="Registration progress">
                                    <span class="step is-active" data-step-indicator="1"><b>1</b>Account &amp; Contact</span>
                                    <i></i>
                                    <span class="step" data-step-indicator="2"><b>2</b>Location &amp; Consent</span>
                                </div>

                                <section class="register-section" data-step-section="1">
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

                                <section class="register-section" data-step-section="2">
                                    <h2><i class="bi bi-geo-alt-fill"></i>Location</h2>
                                    <div class="register-field"><i class="bi bi-geo-alt"></i><label>Region<select name="region"><option value="">Select region</option><option>National Capital Region</option><option>Region IV-A</option><option>Central Luzon</option></select></label><i class="bi bi-chevron-down"></i></div>
                                    <div class="register-field"><i class="bi bi-shield-check"></i><label>Province<select name="province"><option value="">Select province</option><option>Metro Manila</option><option>Cavite</option><option>Laguna</option><option>Bulacan</option></select></label><i class="bi bi-chevron-down"></i></div>
                                    <div class="register-field"><i class="bi bi-buildings"></i><label>City / Municipality<select name="city"><option value="">Select city / municipality</option><option>Quezon City</option><option>Manila</option><option>Makati</option><option>Pasig</option></select></label><i class="bi bi-chevron-down"></i></div>
                                    <div class="register-field"><i class="bi bi-geo"></i><label>Barangay<input name="area" required placeholder="Select barangay"></label></div>
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
