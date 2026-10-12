/**
 * Minimal English seed — keeps the UI non-blank during the brief window
 * before the full /locale/en.json fetch resolves on first load.
 *
 * Bundle cost: ~500 B vs ~16 KB for the full static en.json import.
 * Full translations are loaded dynamically from /locale/en.json.
 * Only the most critical keys needed to avoid blank UI are listed here.
 */
export const EN_SEED: Record<string, string> = {
  "common.loading": "Loading...",
  "common.error": "Something went wrong",
  "common.retry": "Retry",
  "common.dismiss": "Dismiss",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.confirm": "Confirm",
  "common.back": "Back",
  "common.next": "Next",
  "common.close": "Close",
  "nav.wallet": "Wallet",
  "nav.circles": "Circles",
  "nav.dashboard": "Dashboard",
  "nav.reputation": "Reputation",
  "nav.settings": "Settings",
  "auth.login.signInButton": "Sign in with Passkey",
  "landing.launchApp": "Launch App",
  "landing.howItWorks": "How it works",
  "payouts.title": "Payouts Received",
  "contributions.title": "My Contributions",
  "notifications.title": "Notifications",
  "governance.title": "Governance",
  "referrals.title": "Referral dashboard",
  "profile.title": "Profile",
  "reputation.title": "Your MoiScore",
  "reputation.loadingAria": "Loading reputation",
}
