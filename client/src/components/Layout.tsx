import { ReactNode, useRef, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, Menu } from "lucide-react";

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

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  useEffect(() => {
    if (!canGoBack) return;

    const MIN_SWIPE_X = 90;
    const MAX_ANGLE_RATIO = 1.5;

    const isInsideHScrollable = (el: HTMLElement | null): boolean => {
      while (el) {
        const style = window.getComputedStyle(el);
        if (style.overflowX === 'auto' || style.overflowX === 'scroll') return true;
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
  }, [canGoBack, onBack, location]);

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto shadow-2xl relative overflow-hidden bg-white/50 md:border-x md:border-border/50">
      {/* Swipe back indicator */}
      {canGoBack && swipeProgress > 0 && (
        <div
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 flex items-center pointer-events-none"
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

      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border/50 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center w-16">
          {canGoBack && (
            <button 
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition-all text-secondary"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
          )}
        </div>
        
        <h1 className="text-lg font-bold text-foreground truncate flex-1 text-center font-display tracking-wide">
          {title}
        </h1>
        
        <div className="flex items-center justify-end w-16">
          <Link href="/" className="p-2 -mr-2 rounded-full hover:bg-muted active:scale-95 transition-all text-secondary">
            <Menu className="w-6 h-6" />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-y-auto w-full">
        {children}
      </main>
    </div>
  );
}
