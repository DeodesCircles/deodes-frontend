# Moistello V1 — All Pages (Updated)

## Legend
- ✅ = Built (56 routes)
- ❌ = Not yet built

---

## Existing Pages (56 routes)

### Auth
- `/` — Landing page promoting passkey-based decentralized savings circles on Stellar.
- `/login` — Sign in with passkey biometrics; redirects to register if no credential stored.
- `/register` — Create passkey, set profile, sign message, auto-create Stellar wallet.

### Dashboard
- `/dashboard` — Overview of active circles, contributions, payouts, and MoiScore.
- `/contributions` — Paginated list of your contributions across all circles.
- `/payouts` — Paginated list of your received payouts across all circles.

### Circles
- `/circles` — Browse public circles with search, status filter, and type filter.
- `/circles/create` — Multi-step wizard to create a savings circle with rules.
- `/circles/:id` — Circle detail: members, rounds, contributions, payouts, activity.
- `/circles/:id/members` — Member list with join date, position, status badges.
- `/circles/:id/rounds` — Round timeline with contribution and payout history per round.
- `/circles/:id/settings` — Edit circle name, description; generate invites; delete circle.

### Communities
- `/communities` — Browse communities with search, category filter, featured section.
- `/communities/create` — Create a community with name, slug, description, category, tags.
- `/communities/:id` — Community detail: members, announcements, activity feed, stats, circles.

### Profile
- `/profile` — Your profile view and edit (display name, bio, social links, stats).
- `/people` — Redirects to /communities (legacy).
- `/people/:id` — Redirects to /communities/:id (legacy).

### Wallet
- `/wallet` — Overview: balance, connected wallets, recent transactions summary.
- `/wallet/deposit` — Deposit Naira via Yellow Card: quote, confirm, fund wallet.
- `/wallet/withdraw` — Withdraw to bank via Yellow Card: quote, select account, confirm.
- `/wallet/settings` — Manage wallet preferences, primary wallet, connected addresses.

### Notifications
- `/notifications` — In-app notification list with read/unread status and categories.

### Settings
- `/settings` — Settings hub with grid of all setting categories and account summary.
- `/settings/account` — Edit display name, email, phone, country, language; delete account.
- `/settings/notifications` — Toggle notification categories and delivery frequency preferences.
- `/settings/privacy` — Profile visibility, leaderboard display, friend request settings.
- `/settings/sessions` — Active device sessions list with revoke and bulk revoke.
- `/settings/theme` — Theme picker (light/dark/system), density, font size selector.
- `/settings/payment` — Saved bank accounts, add/remove bank, default currency preference.
- `/settings/language` — Language, timezone, date format, number format, week start.
- `/settings/savings` — Savings goals with target amounts, progress bars, round-ups toggle.

### Static Pages
- `/about` — Mission, why Stellar, open source, contact information and team.
- `/how-it-works` — Five-step guide to savings circles with payout type explanations.
- `/faq` — Frequently asked questions about circles, passkey auth, MoiScore, zero fees.
- `/privacy` — Privacy policy covering wallet addresses, on-chain data, user rights.
- `/terms` — Terms of service for decentralized savings platform on Stellar.
- `/status` — System status dashboard showing frontend, API, and database uptime.
- `/developers` — API reference, quick start, endpoint list, contributor information.
- `/become-a-contributor` — Apply to contribute as developer, designer, writer, community builder.
- `/support` — Support center with search, ticket submission, and ticket lookup.
- `/docs` — Markdown-rendered documentation with sidebar navigation and full-text search.
- `/docs/api` — Swagger UI interactive REST API documentation with live testing.

### Uploaded Pages
- `/p` — Index of all uploaded markdown pages with sidebar navigation.
- `/p/:slug` — Renders uploaded markdown or HTML file as a full page.

### Utility
- `/setup` — One-time platform setup and initial configuration wizard.

### Error Pages
- `/not-found` — 404 page with navigation options to home, docs, or back.
- `/internal-error` — 500 error page with graceful recovery and support links.
- `/bad-request` — 400 error page for malformed requests or invalid parameters.
- `/access-denied` — 403 error page when user lacks permission to view resource.
- `/auth-required` — 401 error page prompting authentication to access protected content.
- `/global-error` — Global error boundary catching unhandled React rendering errors.

---

## Upcoming Pages (55 planned)

### Communities
- `/communities/:id/circles` — List of savings circles belonging to a specific community.

### Circles
- `/circles/organizing` — Circles you organize with management actions and member invites.
- `/circles/saved` — Bookmarked circles for quick access and future reference.
- `/circles/templates` — Pre-built circle templates for quick creation with defaults.
- `/circles/featured` — Curated high-quality circles picked by platform administrators.
- `/circles/create/templates/:id` — Create circle pre-filled from template with editable fields.
- `/circles/compare` — Side-by-side comparison of multiple circles across all attributes.
- `/circles/:id/activity` — Chronological activity feed with filters by event type.
- `/circles/:id/export` — Export circle data as CSV or JSON with scope selection.
- `/circles/:id/analytics` — Charts and stats for contribution rates, payouts, member activity.
- `/circles/:id/schedule` — Calendar view of upcoming deadlines, payouts, and round dates.
- `/circles/:id/comments` — Single-thread per-round comments for circle member coordination.

### Dashboard & Insights
- `/insights/activity` — Unified activity timeline across all circles, contributions, and payouts.

### Wallet
- `/wallet/transactions` — Full transaction history with filters by type, date, and circle.
- `/wallet/transactions/:id` — Single transaction detail with hash, status, and Stellar explorer link.
- `/wallet/addresses` — Manage connected Stellar addresses, set primary, add or remove.

### Notifications
- `/notifications/archive` — All read notifications with sort, filter, and clear archive.

### Moderator Tools
- `/mod/users` — User management table with search, filters, suspend, and notes.
- `/mod/users/:id` — Full user context: profile, activity, flags, mod notes, sessions.
- `/mod/users/:id/notes` — Internal moderator notes with author and timestamp tracking.
- `/mod/users/:id/suspend` — Suspend user with reason, duration, preview, and confirmation.
- `/mod/circles` — Circle moderation table with search, status filter, and force-close.
- `/mod/circles/:id` — Full circle context: members, rounds, activity, and moderation actions.
- `/mod/reports` — Reports queue with filters, resolution actions, and pagination.
- `/mod/reports/:id` — Single report detail with embedded content, evidence, and resolution.

### Platform Admin
- `/admin` — Admin dashboard with user counts, circle stats, system health, quick links.
- `/admin/users` — Full user table with search, filters, bulk actions, and export.
- `/admin/users/:id` — User detail with profile, wallets, circles, activity, and admin overrides.
- `/admin/circles` — Circle admin table with search, filters, force-close, and status changes.
- `/admin/circles/:id` — Circle admin detail with member list, timeline, and force-close.
- `/admin/circles/:id/force-close` — Destructive force-close with type-to-confirm and reason.
- `/admin/feature-flags` — Toggle platform features on/off with audit log of changes.
- `/admin/announcements` — Create and send platform-wide announcements with targeting.
- `/admin/audit-log` — Searchable audit log of all admin actions with JSON detail expand.
- `/admin/metrics` — Charts for users, circles, contributions with date range selector.
- `/admin/tags` — Manage community tags with create, edit, delete, and reorder.
- `/admin/branding` — Customize platform name, logo, favicon, colors, and custom CSS.

### Help & Support
- `/help/circles` — Guide explaining ROSCA model, circle lifecycle, payout types, rules.
- `/help/wallet` — Stellar wallet guide, passkey security tips, troubleshooting common issues.
- `/help/glossary` — A-Z searchable glossary of all platform terms and definitions.

### Onboarding & Education
- `/onboarding/welcome` — Step one of five: welcome message with logo and get started.
- `/onboarding/connect-wallet` — Step two: passkey creation guide with biometric prompt.
- `/onboarding/first-circle` — Step three: join or create first circle with recommendations.
- `/onboarding/profile` — Step four: complete display name and optional bio setup.
- `/tour` — Interactive overlay highlighting key UI elements across the platform.
- `/tutorials` — Card grid of video tutorials with categories and difficulty badges.
- `/tutorials/:id` — Single tutorial with video embed, steps, and related content.
- `/changelog` — Chronological release notes with version tags and feature highlights.

### Developer
- `/developers/api-keys` — Create and manage API keys with permission scopes and revoke.
- `/developers/webhooks` — Register webhooks with event subscriptions and delivery logs.

### Platform
- `/roadmap` — Public roadmap with planned, in-progress, and shipped feature cards.
- `/blog` — Blog article grid with category filter, search, and load more pagination.
- `/blog/:slug` — Full blog article with markdown body, share buttons, related articles.

### Extras
- `/history` — Unified activity timeline across all platform features with filters.
- `/promos` — Active promotions, referral rewards, promo codes, and bonus history.

---

**Total: 56 built + 55 planned = 111 pages**
