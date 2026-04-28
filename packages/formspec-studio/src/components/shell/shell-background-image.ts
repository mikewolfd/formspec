/** @filedesc Shared shell viewport background gradients (Studio + assistant workspace). */

export function getShellBackgroundImage(theme: 'light' | 'dark'): string {
  if (theme === 'dark') {
    return [
      'radial-gradient(circle at 0% 0%, rgba(138,180,255,0.09), transparent 30%)',
      'radial-gradient(circle at 100% 0%, rgba(155,205,207,0.06), transparent 32%)',
      'linear-gradient(180deg, #181819 0%, #141415 42%, #121213 100%)',
    ].join(', ');
  }
  return [
    'radial-gradient(circle at 0% 0%, rgba(122,106,74,0.07), transparent 30%)',
    'radial-gradient(circle at 100% 0%, rgba(74,111,118,0.06), transparent 32%)',
    'linear-gradient(180deg, rgba(252,252,251,0.92) 0%, rgba(243,242,239,0.98) 40%, rgba(235,234,231,0.95) 100%)',
  ].join(', ');
}
