
const COLORS = [
  '#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

const EMOJIS = [
  '🤖', '🧠', '⚡', '🔧', '📊', '🛡️', '🎯', '💡', '🔬', '🎨',
  '📝', '🚀', '🧪', '🏗️', '🔍', '⚙️', '🌐', '🧩', '💻', '🎪',
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getAgentAvatar(agentId: string): { color: string; emoji: string } {
  const h = hashString(agentId);
  return {
    color: COLORS[h % COLORS.length],
    emoji: EMOJIS[h % EMOJIS.length],
  };
}

interface AgentAvatarProps {
  agentId: string;
  name?: string;
  size?: number;
  ring?: boolean;
}

export const AgentAvatar: React.FC<AgentAvatarProps> = ({ agentId, name, size = 40, ring = false }) => {
  const { color, emoji } = getAgentAvatar(agentId);

  return (
    <div
      title={name || agentId}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `${color}20`,
        border: ring ? `2px solid ${color}` : '2px solid transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.5,
        lineHeight: 1,
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {emoji}
    </div>
  );
};
