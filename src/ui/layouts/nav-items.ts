import { BookOpen, LayoutGrid, Settings, TrendingUp } from 'lucide-react';
import { nav } from '@/copy/labels';

/* Four items. Bottom navigation past five becomes a guessing game. */
export const navItems = [
  { to: '/app/library', label: nav.library, icon: BookOpen },
  { to: '/app/review', label: nav.review, icon: LayoutGrid },
  { to: '/app/dashboard', label: nav.progress, icon: TrendingUp },
  { to: '/app/settings', label: nav.settings, icon: Settings },
] as const;
