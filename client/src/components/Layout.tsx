import { ReactNode, useRef, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
import logoKimsClub from "@assets/대지_1_1776987037351.png";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export function Layout({ children, title = "KIMS CLUB VMD", showBack = true, onBack }: LayoutProps) {
  const [location] = useLocation();
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
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Global Header — matches Home.tsx top bar ── */}
      <header
        className="sticky top-0 z-40 bg-white flex items-center justify-between shrink-0"
        style={{ boxShadow: '0px 2px 3px rgba(0,0,0,0.1)' }}
      >
        {/* Desktop */}
        <div
          className="hidden md:flex w-full items-center justify-between"
          style={{ height: '85px', padding: '0 50px' }}
        >
          <div className="flex flex-col justify-center gap-1">
            <img src={logoKimsClub} alt="KIM'S CLUB" style={{ width: '198px', height: '31px', objectFit: 'contain' }} />
            {canGoBack && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors active:scale-95 self-start"
                style={{ fontFamily: "'Pretendard', sans-serif", fontWeight: 500, fontSize: '13px', letterSpacing: '-0.02em' }}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                뒤로
              </button>
            )}
          </div>
          <Link href="/admin/login">
            <button
              className="active:scale-95 transition-transform"
              style={{
                fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
                fontWeight: 600,
                fontSize: '18px',
                letterSpacing: '-0.04em',
                color: '#EAEAEA',
                background: '#000000',
                borderRadius: '100px',
                padding: '13px 35px',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              data-testid="btn-admin-mode"
            >
              관리자 모드
            </button>
          </Link>
        </div>

        {/* Mobile */}
        <div
          className="md:hidden w-full flex items-center justify-between"
          style={{ height: '60px', padding: '0 16px' }}
        >
          <div className="flex items-center gap-2">
            {canGoBack && (
              <button
                onClick={handleBack}
                className="p-1.5 -ml-1.5 rounded-full active:scale-95 transition-all text-muted-foreground"
                data-testid="btn-mobile-back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <img src={logoKimsClub} alt="KIM'S CLUB" style={{ height: '20px', objectFit: 'contain' }} />
          </div>
          <Link href="/admin/login">
            <button
              className="active:scale-95 transition-transform"
              style={{
                fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
                fontWeight: 600,
                fontSize: '13px',
                letterSpacing: '-0.03em',
                color: '#EAEAEA',
                background: '#000000',
                borderRadius: '100px',
                padding: '8px 18px',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              data-testid="btn-admin-mode-mobile"
            >
              관리자 모드
            </button>
          </Link>
        </div>
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
  );
}
