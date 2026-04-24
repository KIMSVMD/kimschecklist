import { ReactNode, useRef, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, ChevronRight, Home, RotateCcw } from "lucide-react";
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
        className="sticky top-0 z-40 bg-white flex items-center justify-between shrink-0 border-b border-gray-200"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      >
        {/* Desktop */}
        <div
          className="hidden md:flex w-full items-center justify-between"
          style={{ height: '85px', padding: '0 50px' }}
        >
          <Link href="/">
            <img src={logoKimsClub} alt="KIM'S CLUB" style={{ width: '198px', height: '31px', objectFit: 'contain', cursor: 'pointer' }} />
          </Link>
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
          <Link href="/">
            <img src={logoKimsClub} alt="KIM'S CLUB" style={{ height: '20px', objectFit: 'contain', cursor: 'pointer' }} />
          </Link>
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

      <main className="flex-1 flex flex-col overflow-y-auto w-full pb-16 md:pb-0">
        {children}
      </main>

      {/* ── Bottom Nav Bar — mobile/tablet only ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex items-center justify-around"
        style={{ height: '56px', boxShadow: '0 -1px 6px rgba(0,0,0,0.07)' }}
      >
        <button
          onClick={() => { if (location !== '/') { const fn = (window as any).__appBack; fn ? fn() : window.history.back(); } }}
          disabled={location === '/'}
          className={`flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-xl transition-colors ${location === '/' ? 'opacity-30' : 'active:bg-gray-100'}`}
          data-testid="btn-nav-back"
          aria-label="뒤로 가기"
        >
          <ChevronLeft className="w-6 h-6 text-gray-600" />
          <span className="text-[10px] text-gray-500">뒤로</span>
        </button>

        <button
          onClick={() => window.history.forward()}
          className="flex flex-col items-center justify-center gap-0.5 w-14 h-14 active:bg-gray-100 rounded-xl transition-colors"
          data-testid="btn-nav-forward"
          aria-label="앞으로 가기"
        >
          <ChevronRight className="w-6 h-6 text-gray-600" />
          <span className="text-[10px] text-gray-500">앞으로</span>
        </button>

        <Link href="/">
          <button
            className="flex flex-col items-center justify-center gap-0.5 w-14 h-14 active:bg-gray-100 rounded-xl transition-colors"
            data-testid="btn-nav-home"
            aria-label="홈으로"
          >
            <Home className="w-6 h-6 text-gray-600" />
            <span className="text-[10px] text-gray-500">홈</span>
          </button>
        </Link>

        <button
          onClick={() => window.location.reload()}
          className="flex flex-col items-center justify-center gap-0.5 w-14 h-14 active:bg-gray-100 rounded-xl transition-colors"
          data-testid="btn-nav-reload"
          aria-label="새로고침"
        >
          <RotateCcw className="w-6 h-6 text-gray-600" />
          <span className="text-[10px] text-gray-500">새로고침</span>
        </button>
      </nav>
    </div>
  );
}
