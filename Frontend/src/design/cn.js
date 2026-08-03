import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs) => twMerge(clsx(inputs));

export const problemNo = (n) => (n === undefined || n === null ? '—' : String(n));

const TOPIC_HUE = {
  arrays:                ['#4ea8ff', '#0b62c4'],
  strings:               ['#ff7bae', '#c01f63'],
  'dynamic programming': ['#b084ff', '#6b31c9'],
  graphs:                ['#35d0c0', '#00786e'],
  trees:                 ['#4ade80', '#0a7a3c'],
  maths:                 ['#ffb84d', '#8f5600'],
  hashing:               ['#ff8a65', '#b8431d'],
  greedy:                ['#f0c420', '#7d6300'],
  recursion:             ['#7be0ff', '#00697f'],
  stacks:                ['#c4a0ff', '#6b3fc9'],
  queues:                ['#8fe388', '#3f7a1f'],
  linkedlists:           ['#ff9cc8', '#b52f74'],
};

export const topicHue = (tag, ground) => {
  const key = String(Array.isArray(tag) ? tag[0] : tag || '').toLowerCase().trim();
  const pair = TOPIC_HUE[key];
  if (!pair) return 'var(--c-ink-2)';
  const isDay =
    ground === 'day' ||
    (typeof document !== 'undefined' &&
      document.documentElement.getAttribute('data-ground') === 'day');
  return isDay ? pair[1] : pair[0];
};

export const DIFFICULTY = {
  easy:   { label: 'Easy',   color: 'var(--c-easy)',   weight: 1, ticks: 1 },
  medium: { label: 'Medium', color: 'var(--c-medium)', weight: 2, ticks: 2 },
  hard:   { label: 'Hard',   color: 'var(--c-hard)',   weight: 3, ticks: 3 },
};

export const difficultyMeta = (d) =>
  DIFFICULTY[String(d || '').toLowerCase()] || {
    label: d || 'Unrated',
    color: 'var(--c-ink-3)',
    weight: 1,
    ticks: 0,
  };

export const formatMemory = (kb) => {
  if (kb === undefined || kb === null) return '—';
  return kb < 1024 ? `${kb} kB` : `${(kb / 1024).toFixed(2)} MB`;
};

export const formatRuntime = (sec) => {
  if (sec === undefined || sec === null) return '—';
  return `${Number(sec).toFixed(2)}s`;
};
