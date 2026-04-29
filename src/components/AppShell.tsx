import {useEffect, useState} from 'react';
import {getIdTokenResult} from 'firebase/auth';
import {BarChart3, BookOpen, Globe, LogOut, Plus, Settings2, Sparkles, WalletCards} from 'lucide-react';
import {NavLink, Outlet, useLocation, useNavigate} from 'react-router-dom';
import {auth} from '../lib/firebase';
import {disableLocalPreview, isLocalPreviewEnabled, previewUser} from '../lib/previewSession';
import {useTheme} from '../lib/theme';
import ThemeToggle from './ThemeToggle';

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();

  const user = auth.currentUser;
  const previewEnabled = isLocalPreviewEnabled();
  const displayName = previewEnabled ? previewUser.displayName : user?.displayName || user?.email?.split('@')[0] || 'Learner';
  const [roles, setRoles] = useState({admin: false, tutor: false});
  const isDashboard = location.pathname === '/dashboard';
  const {resolvedTheme} = useTheme();
  const isLight = resolvedTheme === 'light';

  useEffect(() => {
    let cancelled = false;
    async function loadRoles() {
      if (!user || previewEnabled) return;
      try {
        const token = await getIdTokenResult(user, true);
        if (!cancelled) {
          setRoles({
            admin: token.claims.admin === true,
            tutor: token.claims.tutor === true || token.claims.admin === true,
          });
        }
      } catch (error) {
        console.error('Failed to read navigation roles', error);
      }
    }
    loadRoles();
    return () => { cancelled = true; };
  }, [previewEnabled]);

  const handleSignOut = () => {
    if (previewEnabled) {
      disableLocalPreview();
      navigate('/');
      return;
    }
    void auth.signOut();
  };

  const navPill = (isActive: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-medium transition-colors border whitespace-nowrap inline-flex items-center gap-1.5 ${
      isActive
        ? isLight
          ? 'bg-black/8 text-[var(--text-strong)] border-black/15'
          : 'bg-white/12 text-white border-white/20'
        : isLight
          ? 'text-[var(--text-secondary)] border-[var(--border-soft)] hover:bg-black/[0.04] hover:text-[var(--text-strong)] hover:border-black/15'
          : 'text-white/62 border-white/10 hover:bg-white/[0.04] hover:text-white hover:border-white/20'
    }`;

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${isLight ? 'bg-[var(--app-bg)] text-[var(--text-strong)]' : 'bg-black text-white'}`}>
      <div className={`absolute inset-x-0 top-0 h-[20rem] pointer-events-none z-0 ${isLight ? 'bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.04),_transparent_60%)]' : 'bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.09),_transparent_60%)]'}`} />

      {/* ── Compact single-row header ── */}
      <header className={`relative z-10 border-b backdrop-blur-md shrink-0 ${isLight ? 'bg-[rgba(243,241,232,0.9)] border-black/8 shadow-[0_1px_0_rgba(0,0,0,0.05)]' : 'bg-black/75 border-white/8 shadow-[0_1px_0_rgba(255,255,255,0.04)]'}`}>
        <div className="h-12 px-4 flex items-center gap-3">

          {/* Logo */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 shrink-0 mr-1"
          >
            <div className={`w-8 h-8 rounded-xl liquid-glass border flex items-center justify-center ${isLight ? 'border-black/10' : 'border-white/10'}`}>
              <Globe className={`w-4 h-4 ${isLight ? 'text-[var(--text-primary)]' : 'text-white'}`} />
            </div>
            <span className="text-sm font-semibold tracking-tight hidden sm:block">Teachenza</span>
          </button>

          {/* Nav pills */}
          <nav className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto no-scrollbar">
            <NavLink
              to="/dashboard"
              className={({isActive}) => navPill(isActive)}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Dashboard
            </NavLink>
            <NavLink
              to={previewEnabled ? '/dashboard' : '/profile'}
              className={({isActive}) => navPill(!previewEnabled && isActive)}
            >
              <Settings2 className="w-3.5 h-3.5" />
              Profile
            </NavLink>
            {roles.tutor ? (
              <NavLink
                to="/tutor/earnings"
                className={({isActive}) => navPill(isActive)}
              >
                <WalletCards className="w-3.5 h-3.5" />
                Tutor
              </NavLink>
            ) : null}
            {roles.admin ? (
              <NavLink
                to="/admin/aging"
                className={({isActive}) => navPill(isActive)}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Admin
              </NavLink>
            ) : null}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Greeting (desktop only) */}
            <span className={`text-xs hidden lg:block mr-1 ${isLight ? 'text-[var(--text-muted)]' : 'text-white/40'}`}>
              {displayName}
            </span>

            {/* TOP UP — always visible, prominent */}
            <NavLink
              to={previewEnabled ? '/dashboard' : '/credits'}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                isLight
                  ? 'border-black/12 bg-black/[0.05] text-[var(--text-primary)] hover:bg-black/[0.09] hover:text-[var(--text-strong)]'
                  : 'border-white/12 bg-white/[0.06] text-white/78 hover:bg-white/[0.1] hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Top Up
            </NavLink>

            <div className="w-px h-4 bg-[var(--border-soft)] mx-0.5" />

            <ThemeToggle compact />

            <button
              type="button"
              onClick={handleSignOut}
              className={`rounded-full p-1.5 border transition-colors ${
                isLight
                  ? 'text-[var(--text-muted)] border-[var(--border-soft)] hover:text-[var(--text-strong)] hover:border-black/20'
                  : 'text-white/50 border-white/10 hover:text-white hover:border-white/25'
              }`}
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>

            <div className={`w-7 h-7 rounded-xl liquid-glass border flex items-center justify-center ${
              isLight ? 'border-black/10' : 'border-white/10'
            }`}>
              <Sparkles className={`w-3.5 h-3.5 ${isLight ? 'text-[var(--text-muted)]' : 'text-white/60'}`} />
            </div>
          </div>
        </div>
      </header>

      {/* ── Content area ── */}
      <main className={`relative z-10 flex-1 min-h-0 ${isDashboard ? '' : 'overflow-y-auto'}`}>
        {isDashboard ? (
          <Outlet />
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-8">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
}
