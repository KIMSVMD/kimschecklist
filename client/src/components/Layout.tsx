import { ReactNode, useRef, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ChevronLeft, Menu, Home, ClipboardCheck, ClipboardList,
  LayoutDashboard, BookOpen, Brush, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import kimsClubLogo from "../assets/image_1775461936743.png";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

const NAV_SECTIONS = [
  {
    label: "현장 직원",
    items: [
      { href: "/", icon: Home, label: "홈" },
      { href: "/checklist/new", icon: ClipboardCheck, label: "새 점검 등록" },
      { href: "/staff-dashboard", icon: ClipboardList, label: "점검 월별 피드백" },
      { href: "/cleaning/new", icon: Brush, label: "청소 점검" },
    ],
  },
  {
    label: "VMD 관리자",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "관리자 대시보드" },
      { href: "/admin/guides", icon: BookOpen, label: "가이드 관리" },
    ],
  },
];

function Sidebar({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-5 border-b border-border/40 flex items-center justify-between shrink-0" style={{ height: '70px' }}>
        <img src={kimsClubLogo} alt="KIM'S CLUB" className="h-5 w-auto object-contain" />
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors md:hidden">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-5 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p
              className="text-[11px] text-muted-foreground px-2 mb-1.5"
              style={{ fontFamily: "'Pretendard', sans-serif", fontWeight: 600, letterSpacing: '0.06em' }}
            >
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, icon: Icon, label }) => {
                const isActive = location === href;
                return (
                  <Link key={href} href={href} onClick={onClose}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      )}
                      style={{ fontFamily: "'Pretendard', sans-serif", fontWeight: isActive ? 700 : 500, fontSize: '14px', letterSpacing: '-0.02em' }}
                    >
                      <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                      {label}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-border/40 flex flex-col items-center gap-1">
        <p
          className="text-muted-foreground text-center"
          style={{ fontFamily: "'Pretendard', sans-serif", fontSize: '11px', letterSpacing: '-0.02em' }}
        >
          © 2026, 킴스클럽 VMD
        </p>
      </div>
    </div>
  );
}

export function Layout({ children, title = "KIMS CLUB VMD", showBack = true, onBack }: LayoutProps) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isValidSwipe = useRef(false);
  const [swipeProgress, setSwipeProgress] = useState(0);

  const canGoBack = showBack && location !== "/";
  const swipeEnabled = location !== "/";

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  useEffect(() => {
    if (!swipeEnabled) return;

    const MIN_SWIPE_X = 80;
    const MAX_ANGLE_RATIO = 1.5;

    const isInsideHScrollable = (el: HTMLElement | null): boolean => {
      while (el) {
        const style = window.getComputedStyle(el);
        if (style.overflowX === "auto" || style.overflowX === "scroll") return true;
        el = el.parentElement;
      }
      return false;
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isValidSwipe.current = !isInsideHScrollable(e.target as HTMLElement);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isValidSwipe.current) return;
      const dx = e.touches[0].clientX - touchStartX.current;
      const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
      if (dx > 0 && dx > dy * 0.5) {
        setSwipeProgress(Math.min(dx / MIN_SWIPE_X, 1));
      } else {
        setSwipeProgress(0);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      setSwipeProgress(0);
      if (!isValidSwipe.current) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
      if (dx >= MIN_SWIPE_X && dx > dy * MAX_ANGLE_RATIO) {
        handleBack();
      }
      isValidSwipe.current = false;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [swipeEnabled, onBack, location]);

  return (
    <div className="min-h-screen bg-background flex">

      {/* ── Desktop Sidebar (md+) ── */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border/50 fixed left-0 top-0 h-screen z-40">
        <Sidebar />
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="absolute left-0 top-0 h-full w-72 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-h-screen md:ml-60">

        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-border/50 px-4 h-14 flex items-center justify-between shrink-0">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition-all text-secondary"
            data-testid="btn-mobile-menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {title === "KIMS CLUB" ? (
            <img src={kimsClubLogo} alt="KIM'S CLUB" className="h-5 w-auto object-contain flex-1 mx-2" />
          ) : (
            <h1 className="text-base font-bold text-foreground truncate flex-1 text-center mx-2 font-display tracking-wide">
              {title}
            </h1>
          )}

          <div className="w-10 flex items-center justify-end">
            {canGoBack && (
              <button
                onClick={handleBack}
                className="p-2 -mr-2 rounded-full hover:bg-muted active:scale-95 transition-all text-secondary"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
          </div>
        </header>

        {/* Desktop header bar */}
        <header className="hidden md:flex sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-border/50 px-8 h-14 items-center gap-3 shrink-0">
          {canGoBack && (
            <button
              onClick={handleBack}
              className="p-1.5 rounded-lg hover:bg-muted active:scale-95 transition-all text-secondary flex items-center gap-1 text-sm font-semibold"
            >
              <ChevronLeft className="w-5 h-5" />
              뒤로
            </button>
          )}
          {title === "KIMS CLUB" ? (
            <img src={kimsClubLogo} alt="KIM'S CLUB" className="h-5 w-auto object-contain" />
          ) : (
            <h1 className="text-base font-bold text-foreground font-display tracking-wide">
              {title}
            </h1>
          )}
        </header>

        {/* Swipe back indicator (mobile) */}
        {swipeEnabled && swipeProgress > 0 && (
          <div
            className="fixed left-0 top-1/2 -translate-y-1/2 z-50 flex items-center pointer-events-none md:hidden"
            style={{ opacity: swipeProgress }}
          >
            <div
              className="bg-secondary/80 text-white rounded-r-2xl flex items-center justify-center shadow-xl"
              style={{
                width: `${20 + swipeProgress * 28}px`,
                height: `${40 + swipeProgress * 20}px`,
              }}
            >
              <ChevronLeft className="w-5 h-5" style={{ opacity: swipeProgress }} />
            </div>
          </div>
        )}

        <main className="flex-1 flex flex-col overflow-y-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
