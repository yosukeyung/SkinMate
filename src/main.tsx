import { StrictMode, useState, useEffect, useCallback, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import HeroPage from './Pages/HeroPage'
import ScanPage from './Pages/ScanPage'
import HistoryPage from './Pages/HistoryPage'
import DashboardPage from './Pages/DashboardPage'
import ProgressPage from './Pages/ProgressPage'
import Register from './Pages/Register'
import Login from './Pages/Login'
import ProfilePage from './Pages/ProfilePage'
import { Landing } from './Pages/Landing'

// ─── Global SPA Navigation ──────────────────────────────────────────────────
// Expose a global navigateTo so any component (including non-React code) can
// trigger smooth page transitions without a full reload.

type NavigateFn = (path: string) => void;
let _navigateTo: NavigateFn = (path) => { window.location.href = path; };

export function navigateTo(path: string) {
  _navigateTo(path);
}

// Make it available globally for anchor click interception
(window as unknown as Record<string, unknown>).__skinmate_navigate = navigateTo;

// ─── Route resolver ─────────────────────────────────────────────────────────

function resolveRoute(path: string): React.ReactNode {
  if (path === '/scan' || path === '/app/scan') return <ScanPage />
  if (path === '/history' || path === '/app/history') return <HistoryPage />
  if (path === '/progress' || path === '/app/progress') return <ProgressPage />
  if (path === '/dashboard' || path === '/app/dashboard') return <DashboardPage />
  if (path === '/auth/register' || path === '/app/auth/register') return <Register />
  if (path === '/auth/login' || path === '/app/auth/login') return <Login />
  if (path === '/profile' || path === '/app/profile') return <ProfilePage />
  if (path === '/home' || path === '/app/home') return <Landing loggedIn />
  return <HeroPage />
}

// ─── Transition durations (ms) — match CSS ─────────────────────────────────
const EXIT_DURATION = 220;
const ENTER_DURATION = 500;

// ─── App with natural transitions ───────────────────────────────────────────

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [displayedPage, setDisplayedPage] = useState<React.ReactNode>(() => resolveRoute(window.location.pathname));
  const [transitionClass, setTransitionClass] = useState('page-fade-in');
  const isTransitioning = useRef(false);

  // Remove initial entrance class after animation completes
  useEffect(() => {
    const timer = setTimeout(() => {
      setTransitionClass('');
    }, ENTER_DURATION);
    return () => clearTimeout(timer);
  }, []);

  const doNavigate = useCallback((path: string) => {
    // Ignore if same page or already transitioning
    if (path === currentPath || isTransitioning.current) return;
    isTransitioning.current = true;

    // Phase 1: Exit — quick dissolve
    setTransitionClass('page-fade-out');

    setTimeout(() => {
      // Phase 2: Swap content while invisible
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      setDisplayedPage(resolveRoute(path));
      window.scrollTo({ top: 0, behavior: 'instant' });

      // Phase 3: Enter — gentle reveal
      // Double rAF ensures the browser has painted the new content before animating
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTransitionClass('page-fade-in');
          setTimeout(() => {
            setTransitionClass('');
            isTransitioning.current = false;
          }, ENTER_DURATION);
        });
      });
    }, EXIT_DURATION);
  }, [currentPath]);

  // Register the navigate function globally
  useEffect(() => {
    _navigateTo = doNavigate;
    (window as unknown as Record<string, unknown>).__skinmate_navigate = doNavigate;
  }, [doNavigate]);

  // Handle browser back/forward
  useEffect(() => {
    const onPopState = () => {
      const newPath = window.location.pathname;
      if (newPath === currentPath) return;

      isTransitioning.current = true;
      setTransitionClass('page-fade-out');

      setTimeout(() => {
        setCurrentPath(newPath);
        setDisplayedPage(resolveRoute(newPath));
        window.scrollTo({ top: 0, behavior: 'instant' });

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTransitionClass('page-fade-in');
            setTimeout(() => {
              setTransitionClass('');
              isTransitioning.current = false;
            }, ENTER_DURATION);
          });
        });
      }, EXIT_DURATION);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [currentPath]);

  return (
    <div className={`page-transition-wrapper ${transitionClass}`}>
      {displayedPage}
    </div>
  );
}

// ─── Intercept all <a> clicks for SPA navigation ────────────────────────────

document.addEventListener('click', (e) => {
  const anchor = (e.target as HTMLElement).closest('a');
  if (!anchor) return;

  const href = anchor.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:')) return;

  // Don't intercept if modifier keys are held
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

  e.preventDefault();
  navigateTo(href);
});

// ─── Render ─────────────────────────────────────────────────────────────────

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
