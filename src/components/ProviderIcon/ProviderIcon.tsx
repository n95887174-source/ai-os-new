import React from 'react';
import { Sparkles, Network, Cpu, Zap, Eye, Box } from 'lucide-react';

interface Props {
  provider: string;
  size?: number;
  className?: string;
}

const ProviderIcon: React.FC<Props> = ({ provider, size = 18, className = '' }) => {
  const norm = (provider || '').toLowerCase();

  const getIcon = (): { Icon: React.ElementType; color: string; bg: string } => {
    switch (norm) {
      case 'openai':
        return { Icon: Cpu, color: '#10a37f', bg: 'rgba(16, 163, 127, 0.1)' };
      case 'anthropic':
        return { Icon: Box, color: '#d97757', bg: 'rgba(217, 119, 87, 0.1)' };
      case 'gemini':
        return { Icon: Sparkles, color: '#4285f4', bg: 'rgba(66, 133, 244, 0.1)' };
      case 'groq':
        return { Icon: Zap, color: '#f55036', bg: 'rgba(245, 80, 54, 0.1)' };
      case 'nvidia':
        return { Icon: Eye, color: '#76b900', bg: 'rgba(118, 185, 0, 0.1)' };
      case 'openrouter':
        return { Icon: Network, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' };
      default:
        return { Icon: Box, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' };
    }
  };

  const { Icon, color, bg } = getIcon();

  return (
    <div
      className={`provider-icon-wrapper ${className}`}
      style={{
        width: size + 8,
        height: size + 8,
        borderRadius: 6,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px solid ${color}40`,
        flexShrink: 0,
      }}
    >
      <Icon size={size} color={color} strokeWidth={2.5} />
    </div>
  );
};

export default ProviderIcon;
