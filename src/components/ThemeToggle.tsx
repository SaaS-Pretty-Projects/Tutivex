import {Monitor, Moon, Sun} from 'lucide-react';
import {useTheme, type ThemeMode} from '../lib/theme';

const MODE_META: Record<ThemeMode, {label: string; Icon: typeof Monitor}> = {
  system: {label: 'System', Icon: Monitor},
  dark: {label: 'Dark', Icon: Moon},
  light: {label: 'Bright', Icon: Sun},
};

export default function ThemeToggle({compact = false}: {compact?: boolean}) {
  const {mode, cycleMode} = useTheme();
  const {label, Icon} = MODE_META[mode];

  return (
    <button
      type="button"
      onClick={cycleMode}
      className="rounded-full px-3 py-2 text-sm border border-white/10 text-white/75 hover:text-white hover:border-white/25 transition-colors inline-flex items-center gap-2"
      aria-label={`Theme: ${label}. Click to switch theme.`}
      title={`Theme: ${label}`}
    >
      <Icon className="w-4 h-4" />
      {compact ? null : <span>{label}</span>}
    </button>
  );
}
