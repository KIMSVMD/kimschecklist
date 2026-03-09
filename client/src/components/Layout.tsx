import { ReactNode } from "react";
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

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto shadow-2xl relative overflow-hidden bg-white/50 md:border-x md:border-border/50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border/50 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center w-16">
          {showBack && location !== "/" && (
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
