import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell, AlarmClock, Trophy, ClipboardList, CheckSquare, Flame,
  TriangleAlert, HeartCrack, ShieldCheck, ShieldOff, UserPen, KeyRound,
} from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import axiosClient from '../utils/axiosClient';
import { cn } from '../design/cn';
import { Plotter, EmptySheet, Rule } from '../design/primitives';

const TYPE_ICON = {
  contest_reminder: AlarmClock,
  contest_result: Trophy,
  contest_created: ClipboardList,
  contest_updated: ClipboardList,
  daily_challenge_solved: CheckSquare,
  streak_milestone: Flame,
  streak_at_risk: TriangleAlert,
  streak_broken: HeartCrack,
  premium_purchased: ShieldCheck,
  premium_cancelled: ShieldOff,
  premium_expiring: TriangleAlert,
  profile_updated: UserPen,
  password_reset: KeyRound,
};

const TYPE_TONE = {
  streak_at_risk: 'var(--c-caution)',
  premium_expiring: 'var(--c-caution)',
  streak_broken: 'var(--c-redline)',
  premium_cancelled: 'var(--c-redline)',
  daily_challenge_solved: 'var(--c-approved)',
  streak_milestone: 'var(--c-approved)',
  contest_result: 'var(--c-approved)',
  premium_purchased: 'var(--c-approved)',
};

const timeAgo = (dateString) => {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get('/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenChange = (next) => {
    setOpen(next);
    if (next) fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      await axiosClient.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      try {
        await axiosClient.patch(`/notifications/${notification._id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger
        className="relative flex h-7 w-7 items-center justify-center border border-transparent text-ink-3 transition-colors hover:border-rule hover:text-ink data-[state=open]:border-rule data-[state=open]:text-ink"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      >
        <Bell className="h-3.5 w-3.5" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span
            className="t-micro absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center bg-redline px-0.5 text-sheet"
            style={{ letterSpacing: 0 }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={5}
          className="sheet anim-pop z-50 flex max-h-[26rem] w-[min(23rem,calc(100vw-1.5rem))] flex-col shadow-[var(--shadow-lift)]"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-rule bg-sheet-sunk px-3 py-1.5">
            <span className="t-label text-ink-2">Notices</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="t-micro text-line transition-opacity hover:opacity-75"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <Plotter label="Fetching" className="py-10" />
            ) : notifications.length === 0 ? (
              <EmptySheet title="No notices" detail="Contest results and streak alerts appear here." className="py-10" />
            ) : (
              notifications.map((n, i) => {
                const Icon = TYPE_ICON[n.type] || Bell;
                const tone = TYPE_TONE[n.type];
                return (
                  <button
                    key={n._id}
                    onClick={() => handleNotificationClick(n)}
                    className={cn(
                      'flex w-full gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-sheet-hover',
                      i > 0 && 'border-t border-rule-faint',
                      !n.read && 'bg-[color-mix(in_srgb,var(--c-line)_6%,transparent)]'
                    )}
                  >
                    <Icon
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      strokeWidth={1.75}
                      style={{ color: tone || 'var(--c-ink-3)' }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className={cn('t-body truncate', !n.read ? 'font-semibold text-ink' : 'text-ink-2')}>
                          {n.title}
                        </span>
                        {!n.read && <span className="h-1.5 w-1.5 shrink-0 bg-line" aria-label="Unread" />}
                      </span>
                      <span className="t-body-sm mt-0.5 line-clamp-2 block text-ink-2">{n.message}</span>
                      <span className="t-micro mt-1 block text-ink-3">{timeAgo(n.createdAt)}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export default NotificationBell;
