const DISPLAY_NAMES: Record<string, string> = {
  'full-length':      'Full Length Front',
  'full-length-side': 'Full Length Side',
  'full-length-back': 'Full Length Back',
  'ghost-mannequin':  'Ghost Mannequin',
  'flat-lay':         'Flat Lay',
  'top-down':         'Top Down',
  'front-3/4':        'Front 3/4',
  'back-3/4':         'Back 3/4',
  'mood-2':           'Mood 2',
  'mood-3':           'Mood 3',
}

export function angleDisplayName(label: string): string {
  return DISPLAY_NAMES[label] ??
    label.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
