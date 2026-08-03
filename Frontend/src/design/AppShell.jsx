import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import {
  Flame, Coins, CheckSquare, Sun, Moon, Settings as SettingsIcon,
  LogOut, ShieldCheck, LineChart, Command, LayoutList, CalendarCheck, Trophy,
} from 'lucide-react';
import { logoutUser } from '../authSlice';
import { useGround } from './ground';
import { cn } from './cn';
import { Tooltip } from './overlays';
import {
  DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem,
  DropdownLabel, DropdownSeparator,
} from './overlays';
import NotificationBell from '../components/NotificationBell';
import CommandPalette from './CommandPalette';
import hero from '../assets/hero.png';

const NAV = [
  { to: '/', label: 'Problems', icon: LayoutList, end: true },
  { to: '/daily-challenge', label: 'Daily', icon: CalendarCheck },
  { to: '/contests', label: 'Contests', icon: Trophy },
  { to: '/leaderboard', label: 'Rating', icon: LineChart },
];

const NavTab = ({ to, label, icon: Icon, end }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      cn(
        't-field relative flex shrink-0 items-center gap-1.5 rounded-[9px] px-3.5 py-2 transition-colors duration-150',
        isActive
          ? 'bg-brand text-[var(--c-on-brand)] font-bold'
          : 'text-ink-2 hover:bg-soft-hover hover:text-ink'
      )
    }
  >
    {Icon && <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />}
    {label}
  </NavLink>
);

const StatChip = ({ icon: Icon, label, value, suffix, tone, onClick }) => {
  const body = (
    <>
      <Icon
        className="h-4 w-4 shrink-0"
        strokeWidth={2}
        style={{ color: tone || 'var(--c-ink-3)' }}
        aria-hidden
      />
      <span className="t-data font-semibold text-ink">
        {value}
        {suffix && <span className="text-ink-3">{suffix}</span>}
      </span>
    </>
  );

  const cls =
    'hidden shrink-0 items-center gap-1.5 rounded-[9px] border border-rule bg-sheet px-2.5 py-2 transition-colors sm:flex';

  return (
    <Tooltip label={label}>
      {onClick ? (
        <button type="button" onClick={onClick} className={cn(cls, 'hover:border-rule-strong hover:bg-sheet-hover')}>
          {body}
          <span className="sr-only">{label}</span>
        </button>
      ) : (
        <div className={cls}>
          {body}
          <span className="sr-only">{label}</span>
        </div>
      )}
    </Tooltip>
  );
};

const BlockField = ({ icon: Icon, label, value, tone, tip }) => (
  <Tooltip label={tip}>
    <div className="flex h-full items-center gap-1.5 rounded-full px-2.5">
      {Icon && (
        <Icon
          className="h-3.5 w-3.5 shrink-0"
          strokeWidth={1.9}
          style={{ color: tone || 'var(--c-ink-3)' }}
        />
      )}
      <span className="t-micro hidden text-ink-3 sm:inline">{label}</span>
      <span className="t-data font-semibold" style={tone ? { color: tone } : undefined}>
        {value}
      </span>
    </div>
  </Tooltip>
);

export default function AppShell({ children, solvedCount, onCreditsInfo, fill, titleFields }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { ground, toggle } = useGround();
  const { user } = useSelector((state) => state.auth);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const initial = user?.firstName?.[0]?.toUpperCase() || 'U';
  const section =
    location.pathname === '/' ? 'Problems' : location.pathname.split('/')[1] || 'Problems';

  return (
    <div className={cn('relative z-10 flex flex-col', fill ? 'h-screen overflow-hidden' : 'min-h-screen')}>
      <header className="sticky top-0 z-30 shrink-0 border-b border-rule bg-sheet-raised">
        <div className="relative flex h-14 items-center gap-2 px-3 md:px-4">
          <NavLink
            to="/"
            className="flex shrink-0 items-center gap-2 rounded-[9px] px-1.5 py-1 transition-colors hover:bg-soft-hover"
          >
            <img src={hero} alt="" className="h-[24px] w-[24px]" />
            <span className="text-[17px] font-extrabold leading-none tracking-[-0.01em] text-ink">
              Coddex
            </span>
          </NavLink>

          <nav className="ml-3 hidden items-center gap-1 md:flex">
            {NAV.map((n) => <NavTab key={n.to} {...n} />)}
            {user?.role === 'admin' && <NavTab to="/admin" label="Admin" icon={ShieldCheck} />}
          </nav>

          <div className="flex-1" />

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="t-micro hidden items-center gap-1.5 rounded-[9px] border border-rule bg-sheet px-3 py-2 text-ink-3 transition-colors hover:border-rule-strong hover:text-ink-2 sm:flex"
          >
            <Command className="h-3.5 w-3.5" strokeWidth={1.9} />
            Jump
            <kbd className="t-data rounded border border-rule px-1 text-[10px] leading-[14px]">⌘K</kbd>
          </button>

          <StatChip
            icon={Flame}
            label="Day streak"
            value={user?.dailyStreak ?? 0}
            suffix="d"
            tone={user?.dailyStreak > 0 ? 'var(--c-caution)' : undefined}
            onClick={onCreditsInfo}
          />
          <StatChip
            icon={Coins}
            label="Credits"
            value={(user?.credits ?? 0).toLocaleString()}
            tone="var(--c-line)"
            onClick={onCreditsInfo}
          />

          <NavLink
            to="/premium"
            className={cn(
              't-field flex shrink-0 items-center gap-1.5 rounded-[9px] px-3.5 py-2 transition-colors',
              user?.isPremium
                ? 'border border-caution/45 bg-caution/12 text-caution hover:bg-caution/20'
                : 'bg-caution text-[var(--c-on-caution)] font-bold hover:brightness-110'
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.9} />
            <span className="hidden sm:inline">{user?.isPremium ? 'Premium' : 'Go Premium'}</span>
            <span className="sr-only sm:hidden">{user?.isPremium ? 'Premium' : 'Go Premium'}</span>
          </NavLink>

          <NotificationBell />

          <DropdownMenu>
            <DropdownTrigger className="flex shrink-0 items-center gap-2 rounded-[9px] p-1 pr-2.5 transition-colors hover:bg-soft-hover data-[state=open]:bg-soft-hover">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[12.5px] font-bold text-white">{initial}</span>
                )}
              </span>
              <span className="t-field hidden text-ink-2 lg:inline">{user?.firstName}</span>
              <span className="sr-only">Account menu</span>
            </DropdownTrigger>
            <DropdownContent>
              <DropdownLabel>{user?.emailId}</DropdownLabel>
              <DropdownSeparator />
              <DropdownItem icon={LineChart} onSelect={() => navigate('/progress')}>Progress</DropdownItem>
              <DropdownItem icon={SettingsIcon} onSelect={() => navigate('/settings')}>Settings</DropdownItem>
              {user?.role === 'admin' && (
                <DropdownItem icon={ShieldCheck} onSelect={() => navigate('/admin')}>Admin</DropdownItem>
              )}
              <DropdownSeparator />
              <DropdownItem icon={LogOut} tone="danger" onSelect={() => dispatch(logoutUser())}>
                Log out
              </DropdownItem>
            </DropdownContent>
          </DropdownMenu>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto px-3 pb-2.5 md:hidden">
          {NAV.map((n) => <NavTab key={n.to} {...n} />)}
          {user?.role === 'admin' && <NavTab to="/admin" label="Admin" icon={ShieldCheck} />}
        </nav>
      </header>

      <main className={cn('relative', fill ? 'min-h-0 flex-1' : 'flex-1')}>{children}</main>

      <footer className="sticky bottom-0 z-30 flex h-9 shrink-0 items-stretch gap-1 border-t border-rule bg-sheet-raised px-2">
        <div className="flex items-center gap-1.5 px-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden />
          <span className="t-field capitalize text-ink-2">{section}</span>
        </div>

        {titleFields ? (
          <div className="flex min-w-0 flex-1 items-stretch overflow-hidden">{titleFields}</div>
        ) : (
          <div className="flex-1" />
        )}

        {solvedCount !== undefined && (
          <BlockField
            icon={CheckSquare}
            label="Solved"
            value={solvedCount}
            tone="var(--c-approved)"
            tip="Problems you have an accepted submission for"
          />
        )}

        <Tooltip label={ground === 'night' ? 'Bring up the day' : 'Fade to night'}>
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-1.5 rounded-full px-2.5 text-ink-3 transition-colors hover:bg-soft-hover hover:text-ink"
            aria-label={ground === 'night' ? 'Bring up the day' : 'Fade to night'}
          >
            {ground === 'night'
              ? <Sun className="h-3.5 w-3.5" strokeWidth={1.9} />
              : <Moon className="h-3.5 w-3.5" strokeWidth={1.9} />}
          </button>
        </Tooltip>
      </footer>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
