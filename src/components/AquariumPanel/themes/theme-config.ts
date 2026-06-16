/**
 * Aquarium Theme System
 * Multiple visualization themes: Ocean, Space, Forest, Cyberpunk
 */

export type AquariumTheme = 'ocean' | 'space' | 'forest' | 'cyberpunk';

export interface ThemeConfig {
  id: AquariumTheme;
  name: string;
  description: string;
  icon: string;
  
  // Background
  backgroundGradient: [string, string];
  backgroundPattern?: string;
  
  // Lighting
  ambientColor: string;
  ambientIntensity: number;
  lightColor: string;
  lightIntensity: number;
  
  // Entities
  entityColors: {
    provider: string[];
    idle: string;
    event: string;
    maintenance: string;
  };
  
  // Effects
  particleColor: string;
  bubbleColor: string;
  glowColor: string;
  
  // Time of day
  dayColors: {
    bg1: string;
    bg2: string;
    ambient: string;
    light: string;
  };
  nightColors: {
    bg1: string;
    bg2: string;
    ambient: string;
    light: string;
  };
  
  // Special effects
  rainEffect?: boolean;
  snowEffect?: boolean;
  stars?: boolean;
}

export const THEMES: Record<AquariumTheme, ThemeConfig> = {
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Classic underwater world with fish, jellyfish, and coral',
    icon: '🌊',
    
    backgroundGradient: ['#0a1628', '#1a3a5c'],
    
    ambientColor: '#4a90a4',
    ambientIntensity: 0.3,
    lightColor: '#87ceeb',
    lightIntensity: 0.8,
    
    entityColors: {
      provider: ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'],
      idle: '#e8f4f8',
      event: '#ffd700',
      maintenance: '#00ff88'
    },
    
    particleColor: '#ffffff',
    bubbleColor: 'rgba(255,255,255,0.3)',
    glowColor: 'rgba(52,152,219,0.5)',
    
    dayColors: {
      bg1: '#0a1628',
      bg2: '#1a3a5c',
      ambient: '#4a90a4',
      light: '#87ceeb'
    },
    nightColors: {
      bg1: '#050d17',
      bg2: '#0d2540',
      ambient: '#2a5a6a',
      light: '#4a7a8a'
    }
  },
  
  space: {
    id: 'space',
    name: 'Space',
    description: 'Galactic universe with rockets, stars, and planets',
    icon: '🚀',
    
    backgroundGradient: ['#0a0a1a', '#1a1a3a'],
    
    ambientColor: '#2a2a4a',
    ambientIntensity: 0.2,
    lightColor: '#ffffff',
    lightIntensity: 0.9,
    
    entityColors: {
      provider: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da'],
      idle: '#6a6a8a',
      event: '#ffd700',
      maintenance: '#00ff00'
    },
    
    particleColor: '#ffffff',
    bubbleColor: 'rgba(255,255,255,0.1)',
    glowColor: 'rgba(255,215,0,0.4)',
    
    dayColors: {
      bg1: '#0a0a1a',
      bg2: '#1a1a3a',
      ambient: '#2a2a4a',
      light: '#ffffff'
    },
    nightColors: {
      bg1: '#000010',
      bg2: '#0a0a2a',
      ambient: '#1a1a3a',
      light: '#c0c0ff'
    },
    
    stars: true
  },
  
  forest: {
    id: 'forest',
    name: 'Forest',
    description: 'Enchanted woodland with birds, trees, and fireflies',
    icon: '🌲',
    
    backgroundGradient: ['#0a1a0a', '#1a3a1a'],
    
    ambientColor: '#3a6a3a',
    ambientIntensity: 0.25,
    lightColor: '#90ee90',
    lightIntensity: 0.7,
    
    entityColors: {
      provider: ['#228b22', '#32cd32', '#ff4500', '#ffa500', '#9370db', '#20b2aa'],
      idle: '#98fb98',
      event: '#ffff00',
      maintenance: '#00ff7f'
    },
    
    particleColor: '#90ee90',
    bubbleColor: 'rgba(144,238,144,0.2)',
    glowColor: 'rgba(50,205,50,0.4)',
    
    dayColors: {
      bg1: '#0a1a0a',
      bg2: '#1a3a1a',
      ambient: '#3a6a3a',
      light: '#90ee90'
    },
    nightColors: {
      bg1: '#051005',
      bg2: '#0d1f0d',
      ambient: '#2a4a2a',
      light: '#50c050'
    }
  },
  
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Neon-lit digital city with digital rain and glitch effects',
    icon: '⚡',
    
    backgroundGradient: ['#0a0a0a', '#1a0a2a'],
    
    ambientColor: '#2a0a3a',
    ambientIntensity: 0.15,
    lightColor: '#ff00ff',
    lightIntensity: 1.0,
    
    entityColors: {
      provider: ['#ff00ff', '#00ffff', '#ff0066', '#00ff00', '#ffff00', '#ff6600'],
      idle: '#333333',
      event: '#ff3366',
      maintenance: '#00ffcc'
    },
    
    particleColor: '#ff00ff',
    bubbleColor: 'rgba(255,0,255,0.2)',
    glowColor: 'rgba(255,0,255,0.6)',
    
    dayColors: {
      bg1: '#0a0a0a',
      bg2: '#1a0a2a',
      ambient: '#2a0a3a',
      light: '#ff00ff'
    },
    nightColors: {
      bg1: '#050505',
      bg2: '#0d0515',
      ambient: '#1a0520',
      light: '#cc00cc'
    }
  }
};

export const THEME_ORDER: AquariumTheme[] = ['ocean', 'space', 'forest', 'cyberpunk'];

export function getTheme(id: AquariumTheme): ThemeConfig {
  return THEMES[id] || THEMES.ocean;
}

export function getAllThemes(): ThemeConfig[] {
  return THEME_ORDER.map(id => THEMES[id]);
}

export function getThemeById(id: string): ThemeConfig | undefined {
  return THEMES[id as AquariumTheme];
}

export function getNextTheme(current: AquariumTheme): AquariumTheme {
  const currentIndex = THEME_ORDER.indexOf(current);
  const nextIndex = (currentIndex + 1) % THEME_ORDER.length;
  return THEME_ORDER[nextIndex];
}

export function getPreviousTheme(current: AquariumTheme): AquariumTheme {
  const currentIndex = THEME_ORDER.indexOf(current);
  const prevIndex = currentIndex === 0 ? THEME_ORDER.length - 1 : currentIndex - 1;
  return THEME_ORDER[prevIndex];
}

/**
 * Get CSS variables for a theme (for inline styles)
 */
export function getThemeCSSVariables(theme: ThemeConfig): Record<string, string> {
  return {
    '--aquarium-bg-1': theme.backgroundGradient[0],
    '--aquarium-bg-2': theme.backgroundGradient[1],
    '--aquarium-ambient': theme.ambientColor,
    '--aquarium-light': theme.lightColor,
    '--aquarium-particle': theme.particleColor,
    '--aquarium-bubble': theme.bubbleColor,
    '--aquarium-glow': theme.glowColor,
    '--aquarium-entity-idle': theme.entityColors.idle,
    '--aquarium-entity-event': theme.entityColors.event,
    '--aquarium-entity-maintenance': theme.entityColors.maintenance,
  };
}

/**
 * Interpolate between day and night colors based on time
 */
export function getTimeInterpolatedColors(
  theme: ThemeConfig,
  dayProgress: number // 0 = midnight, 0.5 = noon, 1 = midnight
): { bg1: string; bg2: string; ambient: string; light: string } {
  // dayProgress: 0-0.5 is morning to noon to evening
  // dayProgress: 0.5-1 is evening to night to midnight
  
  const isDay = dayProgress >= 0.2 && dayProgress <= 0.8;
  
  if (isDay) {
    return {
      bg1: theme.dayColors.bg1,
      bg2: theme.dayColors.bg2,
      ambient: theme.dayColors.ambient,
      light: theme.dayColors.light
    };
  } else {
    return {
      bg1: theme.nightColors.bg1,
      bg2: theme.nightColors.bg2,
      ambient: theme.nightColors.ambient,
      light: theme.nightColors.light
    };
  }
}