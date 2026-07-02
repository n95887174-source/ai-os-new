const VALID_THEMES = [
    'dark',
    'light',
    'cyberpunk',
    'nature',
    'ocean',
    'sunset',
    'high-contrast',
] as const;
const e = localStorage.getItem('super-agents-theme');
const theme =
    e && VALID_THEMES.includes(e as (typeof VALID_THEMES)[number])
        ? e
        : !e && matchMedia('(prefers-color-scheme:dark)').matches
          ? 'dark'
          : 'light';
document.documentElement.setAttribute('data-theme', theme);
