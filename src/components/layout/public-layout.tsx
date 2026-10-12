"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Scale,
  Lock,
  BookOpen,
  CircleQuestionMark,
  Globe,
  Users,
  Compass,
  CirclePlus,
  Dices,
  Trophy,
  Landmark,
  ChevronDown,
  ChevronRight,
  ShieldQuestionMark,
  Shield,
  Mail,
  ScrollText,
  Activity,
  LifeBuoy,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ScrollToTop } from "@/components/shared/scroll-to-top";
import { WaitlistForm } from "@/components/shared/waitlist-form";
import { LanguagePicker } from "@/components/shared/language-picker";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslate } from "@/lib/locale/context";
import dynamic from "next/dynamic";
import { useFocusTrap } from "@/hooks/use-focus-trap";

const DashboardLayout = dynamic(
  () => import("@/components/layout/dashboard-layout").then((m) => m.DashboardLayout),
  { ssr: false }
);

interface PublicLayoutProps {
  children: React.ReactNode;
}

// ── Prime nav data (agentsdb mega-menu pattern, DEODES destinations) ─────────
interface NavChild {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  children?: Array<{ title: string; description: string; href: string }>;
}

interface NavGroup {
  heading: string;
  items: NavChild[];
}

interface NavMenu {
  label: string;
  groups: NavGroup[];
}

const iconCls = "h-[18px] w-[18px]";

const PLATFORM_MENU: NavMenu = {
  label: "Platform",
  groups: [
    {
      heading: "Save",
      items: [
        { title: "Explore circles", description: "Browse public, private and community circles.", href: "/explore", icon: <Compass className={iconCls} /> },
        {
          title: "Circle types",
          description: "Permissionless, invite-only, token-gated, premium.",
          href: "/explore#types",
          icon: <Globe className={iconCls} />,
          children: [
            { title: "Public circles", description: "Open to all qualifying savers.", href: "/explore#public" },
            { title: "Private circles", description: "Invite-only via link or code.", href: "/explore#private" },
            { title: "Community circles", description: "Token-gated for DAOs and holders.", href: "/explore#community" },
            { title: "Premium circles", description: "Higher limits, collateralized.", href: "/explore#premium" },
          ],
        },
        { title: "Start a circle", description: "Spin up daily, weekly or monthly rounds.", href: "/register", icon: <CirclePlus className={iconCls} /> },
        { title: "How circles work", description: "Lifecycle, penalties and collateral explained.", href: "/how-it-works", icon: <BookOpen className={iconCls} /> },
      ],
    },
    {
      heading: "Earn",
      items: [
        {
          title: "Payout modes",
          description: "Random, fixed, auction and vote-based rules.",
          href: "/payout-modes",
          icon: <Dices className={iconCls} />,
          children: [
            { title: "Random", description: "Provably-fair VRF draw.", href: "/payout-modes#random" },
            { title: "Fixed order", description: "Known sequence, day one.", href: "/payout-modes#fixed" },
            { title: "Auction", description: "Chit-fund bidding.", href: "/payout-modes#auction" },
            { title: "Vote-based", description: "Community decides.", href: "/payout-modes#vote" },
          ],
        },
        { title: "DeoScore", description: "Portable 0–1000 savings reputation.", href: "/deoscore", icon: <Trophy className={iconCls} /> },
        { title: "Governance", description: "Vote on circles and disputes.", href: "/deoscore#governance", icon: <Landmark className={iconCls} /> },
      ],
    },
    {
      heading: "Build",
      items: [
        { title: "Documentation", description: "Guides for every workflow.", href: "/docs", icon: <BookOpen className={iconCls} /> },
        { title: "Status", description: "Live uptime and response times.", href: "/status", icon: <Activity className={iconCls} /> },
        { title: "Changelog", description: "What shipped recently.", href: "/changelog", icon: <ScrollText className={iconCls} /> },
      ],
    },
  ],
};

const RES_MENU: NavMenu = {
  label: "Resources",
  groups: [
    {
      heading: "Learn",
      items: [
        { title: "How it works", description: "From passkey to payout.", href: "/how-it-works", icon: <ShieldQuestionMark className={iconCls} /> },
        { title: "About", description: "Mission and why Arc.", href: "/about", icon: <Shield className={iconCls} /> },
        { title: "FAQ", description: "Answers about circles and payouts.", href: "/faq", icon: <CircleQuestionMark className={iconCls} /> },
        { title: "Transparency & fees", description: "Protocol economics, open source.", href: "/transparency", icon: <Scale className={iconCls} /> },
      ],
    },
    {
      heading: "Support",
      items: [
        { title: "Support", description: "Tickets and lookups.", href: "/support", icon: <LifeBuoy className={iconCls} /> },
        { title: "Contact", description: "Reach the team.", href: "/contact", icon: <Mail className={iconCls} /> },
        { title: "Terms", description: "The fine print.", href: "/terms", icon: <Scale className={iconCls} /> },
        { title: "Privacy", description: "How data is handled.", href: "/privacy", icon: <Lock className={iconCls} /> },
      ],
    },
  ],
};

const COMMUNITY_MENU: NavMenu = {
  label: "Community",
  groups: [
    {
      heading: "Participate",
      items: [
        { title: "Governance", description: "Vote on circles and disputes.", href: "/deoscore#governance", icon: <Landmark className={iconCls} /> },
        { title: "Communities", description: "Save with your DAO or holder group.", href: "/explore#community", icon: <Users className={iconCls} /> },
        { title: "Become a contributor", description: "Build Deodes with us.", href: "/become-a-contributor", icon: <Sparkles className={iconCls} /> },
      ],
    },
    {
      heading: "Connect",
      items: [
        { title: "Contact", description: "Reach the team.", href: "/contact", icon: <Mail className={iconCls} /> },
        { title: "X — cyprianzube", description: "Launch news and updates.", href: "https://x.com/cyprianzube", icon: <XIcon className={iconCls} /> },
        { title: "X — nekwasar", description: "Builder updates.", href: "https://x.com/nekwasar", icon: <XIcon className={iconCls} /> },
      ],
    },
  ],
};

const SOCIALS = [
  { label: "X — cyprianzube", href: "https://x.com/cyprianzube" },
  { label: "X — nekwasar", href: "https://x.com/nekwasar" },
];

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-4 w-4"} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function MegaDropdown({
  menu,
  open,
  onOpen,
  onClose,
}: {
  menu: NavMenu;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const [openChild, setOpenChild] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setOpenChild(null);
  }, [open ]);

  return (
    <div className="relative" onMouseEnter={onOpen} onMouseLeave={() => { onClose(); setOpenChild(null); }}>
      <button
        type="button"
        onClick={() => (open ? onClose() : onOpen())}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-all duration-300",
          open ? "text-foreground glass-whisper" : "text-muted-foreground hover:text-foreground hover:glass-whisper",
        )}
      >
        {menu.label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="absolute left-1/2 top-full z-50 w-[780px] max-w-[90vw] -translate-x-1/2 pt-3"
          >
            <div className="bg-[#f7f7fa] dark:bg-[#0b0b13] backdrop-blur-2xl rounded-2xl border border-black/10 dark:border-white/[0.12] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
              <div className="grid grid-cols-3 gap-4">
                {menu.groups.map((group) => (
                  <div key={group.heading}>
                    <p className="px-3 pb-2 font-heading text-[10px] tracking-[0.25em] uppercase text-muted-foreground/60">
                      {group.heading}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map((item) => (
                        item.children !== undefined && item.children.length > 0 ? (
                          <div
                            key={item.title}
                            className="relative"
                            onMouseEnter={() => setOpenChild(item.title)}
                            onMouseLeave={() => setOpenChild((c) => (c === item.title ? null : c))}
                          >
                            <Link
                              href={item.href}
                              scroll={false}
                              onClick={onClose}
                              {...(item.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                              className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:glass-whisper transition-all duration-200"
                            >
                              <span className="mt-0.5 shrink-0 text-muted-foreground">{item.icon}</span>
                              <span className="flex-1">
                                <span className="block text-sm font-medium text-foreground">{item.title}</span>
                                <span className="block text-xs text-muted-foreground mt-0.5 leading-snug">
                                  {item.description}
                                </span>
                              </span>
                              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                            </Link>
                            <AnimatePresence>
                              {openChild === item.title && (
                                <motion.div
                                  initial={{ opacity: 0, x: -6 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -6 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute left-full top-0 z-50 ml-2 w-64 rounded-2xl bg-[#f7f7fa] dark:bg-[#0b0b13] border border-black/10 dark:border-white/[0.12] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
                                >
                                  {item.children.map((child) => (
                                    <Link
                                      key={child.title}
                                      href={child.href}
                                      scroll={false}
                                      onClick={onClose}
                                      {...(child.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                                      className="block rounded-xl px-3 py-2 hover:glass-whisper transition-all duration-200"
                                    >
                                      <span className="block text-sm font-medium text-foreground">{child.title}</span>
                                      <span className="block text-xs text-muted-foreground mt-0.5">{child.description}</span>
                                    </Link>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ) : (
                          <Link
                            key={item.title}
                            href={item.href}
                            scroll={false}
                            onClick={onClose}
                            {...(item.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                            className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:glass-whisper transition-all duration-200"
                          >
                            <span className="mt-0.5 shrink-0 text-muted-foreground">{item.icon}</span>
                            <span>
                              <span className="block text-sm font-medium text-foreground">{item.title}</span>
                              <span className="block text-xs text-muted-foreground mt-0.5 leading-snug">
                                {item.description}
                              </span>
                            </span>
                          </Link>
                        )
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openMega, setOpenMega] = useState<string | null>(null);
  const [openAcc, setOpenAcc] = useState<string | null>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const { t } = useTranslate();

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((prev) => !prev), []);
  const mobileMenuRef = useFocusTrap<HTMLDivElement>(menuOpen, closeMenu);
  const megaRootRef = useRef<HTMLDivElement>(null);

  // Click-away + Escape close for mega-menus (agentsdb site-nav pattern).
  const openMegaRef = useRef(openMega);
  openMegaRef.current = openMega;
  useEffect(() => {
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as Node | null;
      const root = megaRootRef.current;
      if (target !== null && root !== null && !root.contains(target) && openMegaRef.current !== null) {
        setOpenMega(null);
      }
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpenMega(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Authenticated users see public pages inside the dashboard layout
  if (isAuthenticated) {
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  const tr = (key: string, fallback: string): string => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  const allMenus: NavMenu[] = [PLATFORM_MENU, COMMUNITY_MENU, RES_MENU];

  return (
    <div className="min-h-screen bg-[rgb(var(--background))]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-foreground"
      >
        Skip to main content
      </a>
      {/* ════════════════ FLOATING HEADER — prime mega-nav ════════════════ */}
      <header className="fixed top-0 left-0 right-0 z-50 px-3 px-edge-safe pt-header-safe">
        <div
          className={cn(
            "flex items-center justify-between h-14 px-4 rounded-2xl",
            "glass-strong backdrop-blur-2xl",
            "border border-white/[0.06] dark:border-white/[0.08]",
            "depth-3",
            "max-w-6xl mx-auto",
          )}
        >
          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-2 select-none shrink-0">
            <span className="gradient-text-extended font-heading font-bold text-lg tracking-tight">
              Deodes
            </span>
          </Link>

          {/* Center: Desktop mega-nav */}
          <div ref={megaRootRef} className="hidden md:flex items-center gap-1" aria-label="Primary navigation">
            {allMenus.map((menu) => (
              <MegaDropdown
                key={menu.label}
                menu={menu}
                open={openMega === menu.label}
                onOpen={() => setOpenMega(menu.label)}
                onClose={() => setOpenMega(null)}
              />
            ))}
          </div>

          {/* Right: Log in + Start saving + theme + hamburger */}
          <div className="flex items-center gap-1.5">
            <Link
              href="/login"
              className="hidden md:inline-flex px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="hidden md:inline-flex h-9 items-center rounded-xl px-4 text-sm font-heading font-semibold text-white gradient-bg-premium hover:opacity-90 transition-all"
            >
              Start saving
            </Link>
            <ThemeToggle />
            <button
              type="button"
              onClick={toggleMenu}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-xl shrink-0 md:hidden",
                "text-muted-foreground transition-all duration-300",
                "hover:text-foreground hover:glass-whisper",
              )}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-public-navigation"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ════════════════ MOBILE DRAWER — accordion groups ════════════════ */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-lg"
              onClick={closeMenu}
              aria-hidden="true"
            />
            <motion.div
              id="mobile-public-navigation"
              ref={mobileMenuRef}
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation"
              tabIndex={-1}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-0 right-0 bottom-0 z-50 w-[85vw] max-w-[340px] pr-edge-safe will-change-transform"
            >
              <div
                className={cn(
                  "flex flex-col h-full rounded-l-2xl overflow-hidden",
                  "glass-flagship backdrop-blur-xl",
                  "border-l border-white/[0.08]",
                  "shadow-[_-12px_0_60px_rgba(0,0,0,0.3)]",
                )}
              >
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-aurora-violet/40 to-transparent" />
                <div className="flex h-16 items-center justify-between px-5 shrink-0">
                  <span className="gradient-text-extended font-heading font-bold text-xl">Deodes</span>
                  <button
                    type="button"
                    onClick={closeMenu}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:glass-whisper transition-all duration-300"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" aria-label="Mobile navigation">
                  {allMenus.map((menu) => (
                    <div key={menu.label} className="border-b border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => setOpenAcc(openAcc === menu.label ? null : menu.label)}
                        aria-expanded={openAcc === menu.label}
                        className="flex w-full items-center justify-between px-3 py-3 text-sm font-heading font-semibold text-foreground"
                      >
                        {menu.label}
                        <ChevronDown
                          className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", openAcc === menu.label && "rotate-180")}
                        />
                      </button>
                      {openAcc === menu.label && (
                        <div className="space-y-3 px-3 pb-4">
                          {menu.groups.map((group) => (
                            <div key={group.heading}>
                              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
                                {group.heading}
                              </p>
                              <div className="mt-1">
                                {group.items.map((item) => (
                                  item.children !== undefined && item.children.length > 0 ? (
                                    <div key={item.title}>
                                      <button
                                        type="button"
                                        onClick={() => setOpenSub(openSub === item.title ? null : item.title)}
                                        aria-expanded={openSub === item.title}
                                        className="flex w-full items-center justify-between px-1 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                                      >
                                        {item.title}
                                        <ChevronDown
                                          className={cn("h-3.5 w-3.5 transition-transform duration-200", openSub === item.title && "rotate-180")}
                                        />
                                      </button>
                                      {openSub === item.title && (
                                        <div className="ml-3 space-y-0.5 border-l border-white/10 pl-3">
                                          <Link
                                            href={item.href}
                                            scroll={false}
                                            onClick={closeMenu}
                                            className="block px-1 py-1.5 text-sm font-medium text-foreground"
                                          >
                                            View all →
                                          </Link>
                                          {item.children.map((child) => (
                                            <Link
                                              key={child.title}
                                              href={child.href}
                                              scroll={false}
                                              onClick={closeMenu}
                                              className="block px-1 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                                            >
                                              {child.title}
                                            </Link>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <Link
                                      key={item.title}
                                      href={item.href}
                                      scroll={false}
                                      onClick={closeMenu}
                                      {...(item.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                                      className="block px-1 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                                    >
                                      {item.title}
                                    </Link>
                                  )
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <p className="px-3 pt-6 pb-2 font-heading text-[10px] tracking-[0.25em] uppercase text-muted-foreground/60">
                    Legal
                  </p>
                  {[
                    { label: tr("nav.terms", "Terms"), href: "/terms", icon: <Scale className="h-[18px] w-[18px]" /> },
                    { label: tr("nav.privacy", "Privacy"), href: "/privacy", icon: <Lock className="h-[18px] w-[18px]" /> },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenu}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:glass-whisper transition-all duration-300"
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </nav>
                <div className="shrink-0 border-t border-white/[0.06] px-4 py-4 space-y-3">
                  <div className="flex gap-2">
                    <Link
                      href="/login"
                      onClick={closeMenu}
                      className="flex-1 inline-flex h-10 items-center justify-center rounded-xl text-sm glass-whisper"
                    >
                      Log in
                    </Link>
                    <Link
                      href="/register"
                      onClick={closeMenu}
                      className="flex-1 inline-flex h-10 items-center justify-center rounded-xl text-sm font-heading font-semibold text-white gradient-bg-premium"
                    >
                      Start saving
                    </Link>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    {SOCIALS.map((s) => (
                      <a
                        key={s.label}
                        href={s.href}
                        aria-label={s.label}
                        className="flex h-9 w-9 items-center justify-center rounded-full glass-whisper text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <XIcon />
                      </a>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 border-t border-white/[0.04] px-5 py-3">
                  <p className="text-[10px] text-muted-foreground/40">
                    &copy; {new Date().getFullYear()} Deodes
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ════════════════ PAGE CONTENT ════════════════ */}
      <main id="main-content" tabIndex={-1} className="pt-20">{children}</main>
      <ScrollToTop />

      {/* ════════════════ FAT FOOTER — solid light, readable in both themes ════════════════ */}
      <footer className="mt-20 border-t border-black/10 dark:border-white/[0.06] bg-[#f7f7fa] dark:bg-black/[0.4]">
        <div className="container-premium grid gap-10 py-16 md:grid-cols-[1.3fr_repeat(3,1fr)] lg:grid-cols-[1.3fr_repeat(7,1fr)]">
          <div>
            <p className="gradient-text-extended font-heading font-bold text-xl">Deodes</p>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground leading-relaxed">
              Decentralized savings circles on Arc. Save together, grow together — with portable
              DeoScore reputation.
            </p>
            <div className="mt-5 flex gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full glass-whisper text-muted-foreground hover:text-foreground transition-colors"
                >
                  <XIcon />
                </a>
              ))}
            </div>
            <div className="mt-6 max-w-xs">
              <WaitlistForm />
            </div>
            <div className="mt-4">
              <LanguagePicker />
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs font-heading tracking-[0.25em] uppercase text-muted-foreground/60">Save</p>
            <div className="flex flex-col space-y-2.5 text-sm font-medium">
              <Link href="/explore" className="hover:text-foreground text-muted-foreground transition-colors">Explore circles</Link>
              <Link href="/explore#types" scroll={false} className="hover:text-foreground text-muted-foreground transition-colors">Circle types</Link>
              <Link href="/register" className="hover:text-foreground text-muted-foreground transition-colors">Start a circle</Link>
              <Link href="/how-it-works" className="hover:text-foreground text-muted-foreground transition-colors">How it works</Link>
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs font-heading tracking-[0.25em] uppercase text-muted-foreground/60">Earn</p>
            <div className="flex flex-col space-y-2.5 text-sm font-medium">
              <Link href="/payout-modes" className="hover:text-foreground text-muted-foreground transition-colors">Payout modes</Link>
              <Link href="/deoscore" className="hover:text-foreground text-muted-foreground transition-colors">DeoScore</Link>
              <Link href="/deoscore#governance" scroll={false} className="hover:text-foreground text-muted-foreground transition-colors">Governance</Link>
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs font-heading tracking-[0.25em] uppercase text-muted-foreground/60">Build</p>
            <div className="flex flex-col space-y-2.5 text-sm font-medium">
              <Link href="/docs" className="hover:text-foreground text-muted-foreground transition-colors">{tr("nav.docs", "Docs")}</Link>
              <Link href="/status" className="hover:text-foreground text-muted-foreground transition-colors">Status</Link>
              <Link href="/changelog" className="hover:text-foreground text-muted-foreground transition-colors">Changelog</Link>
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs font-heading tracking-[0.25em] uppercase text-muted-foreground/60">Company</p>
            <div className="flex flex-col space-y-2.5 text-sm font-medium">
              <Link href="/about" className="hover:text-foreground text-muted-foreground transition-colors">{tr("nav.about", "About")}</Link>
              <Link href="/contact" className="hover:text-foreground text-muted-foreground transition-colors">Contact</Link>
              <Link href="/become-a-contributor" className="hover:text-foreground text-muted-foreground transition-colors">{tr("common.create", "Contribute")}</Link>
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs font-heading tracking-[0.25em] uppercase text-muted-foreground/60">Community</p>
            <div className="flex flex-col space-y-2.5 text-sm font-medium">
              <Link href="/deoscore#governance" scroll={false} className="hover:text-foreground text-muted-foreground transition-colors">Governance</Link>
              <Link href="/explore#community" scroll={false} className="hover:text-foreground text-muted-foreground transition-colors">Communities</Link>
              <Link href="https://x.com/cyprianzube" target="_blank" rel="noopener noreferrer" className="hover:text-foreground text-muted-foreground transition-colors">X — Updates</Link>
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs font-heading tracking-[0.25em] uppercase text-muted-foreground/60">Resources</p>
            <div className="flex flex-col space-y-2.5 text-sm font-medium">
              <Link href="/faq" className="hover:text-foreground text-muted-foreground transition-colors">{tr("nav.faq", "FAQ")}</Link>
              <Link href="/support" className="hover:text-foreground text-muted-foreground transition-colors">{tr("nav.support", "Support")}</Link>
              <Link href="/transparency" className="hover:text-foreground text-muted-foreground transition-colors">Transparency & fees</Link>
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs font-heading tracking-[0.25em] uppercase text-muted-foreground/60">Legal</p>
            <div className="flex flex-col space-y-2.5 text-sm font-medium">
              <Link href="/terms" className="hover:text-foreground text-muted-foreground transition-colors">{tr("nav.terms", "Terms")}</Link>
              <Link href="/privacy" className="hover:text-foreground text-muted-foreground transition-colors">{tr("nav.privacy", "Privacy")}</Link>
            </div>
          </div>
        </div>
        <div className="container-premium">
          <p className="gradient-text-extended font-heading font-black leading-none tracking-tight text-5xl md:text-7xl select-none">
            deodes.com
          </p>
        </div>
        <div className="container-premium mt-8 border-t border-white/[0.06] py-6 text-[11px] leading-relaxed text-muted-foreground/80">
          <p className="font-heading text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-3">
            Risk disclosure
          </p>
          <p>
            DEODES savings circles run on Arc, an open Layer-1 blockchain operated by a
            permissioned validator set. Arc is provided &quot;as is&quot; and &quot;as
            available.&quot; Blockchain use carries inherent risks, including smart-contract
            vulnerabilities, network disruptions, and the absence of recourse for transaction
            errors or losses. Transacting on Arc requires obtaining and using USDC to pay gas
            fees. DEODES contributors provide software only and do not offer regulated financial
            or advisory services. Features may be modified, delayed, or cancelled at any time
            without notice. Nothing on this site constitutes investment, legal, tax, or regulatory
            advice — you are solely responsible for how you use DEODES and for complying with
            applicable laws.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <a href="https://www.arc.io" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Arc Network</a>
            <a href="https://docs.arc.io" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Arc Docs</a>
            <a href="https://portal.arc.io" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Arc Portal</a>
            <span className="text-muted-foreground/60">Arc name and mark belong to Circle Internet Group, Inc.</span>
          </div>
        </div>
        <div className="container-premium mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.06] py-5 text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Deodes. All rights reserved.</span>
          <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <a href="https://cyprianz.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">cyprianz.com</a>
            <a href="https://nekwasar.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">nekwasar.com</a>
          </span>
          <span className="flex items-center gap-2">
            <img src="/arc-logo-white.svg" alt="Arc" className="hidden h-4 w-4 dark:block" />
            <img src="/arc-logo.svg" alt="Arc" className="h-4 w-4 dark:hidden" />
            Built on Arc
          </span>
        </div>
      </footer>
    </div>
  );
}
