import React from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import type { Post, Topic } from '../../kernel/types/forum-types';
import AuthorBadge from './AuthorBadge';
import PostComposer from './PostComposer';

interface TopicViewProps {
    thread: { topic: Topic; posts: Post[] } | null;
    consensus: string | null;
    onModerate: (postId: string, action: string) => void;
    onCompose: (body: string) => void;
    onInviteAgents?: () => void;
    inviting?: boolean;
}

const CONSENSUS_COLORS: Record<string, string> = {
    consensus: '#10b981',
    contested: '#ef4444',
    open: '#f59e0b',
};

const PostCard: React.FC<{ post: Post; onModerate: (id: string, action: string) => void }> = ({
    post,
    onModerate,
}) => (
    <div
        style={{
            border: '1px solid rgba(255,255,255,0.08)',
            background: '#0d1526',
            borderRadius: 8,
            padding: '0.6rem 0.8rem',
            marginBottom: 8,
        }}
    >
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 6,
            }}
        >
            <AuthorBadge author={post.author} />
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {post.agentProvenance && (
                    <span style={{ fontSize: '0.6rem', color: '#64748b' }}>
                        {post.agentProvenance.tokensCost} tok
                    </span>
                )}
                <span style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 700 }}>
                    {post.score}
                </span>
                <button
                    onClick={() => onModerate(post.id, 'hide')}
                    style={iconBtnSmall}
                    title="hide"
                >
                    ○
                </button>
                <button
                    onClick={() => onModerate(post.id, 'remove')}
                    style={iconBtnSmall}
                    title="remove"
                >
                    ×
                </button>
            </div>
        </div>
        <div
            className="forum-post-body"
            dangerouslySetInnerHTML={{ __html: post.renderedHtml }}
            style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: 6, lineHeight: 1.5 }}
        />
    </div>
);

/**
 * TopicView — selected thread: posts + consensus badge + composer.
 */
const TopicView: React.FC<TopicViewProps> = ({
    thread,
    consensus,
    onModerate,
    onCompose,
    onInviteAgents,
    inviting,
}) => {
    const { t } = useTranslation();

    if (!thread) {
        return (
            <div
                style={{
                    fontSize: '0.75rem',
                    color: '#475569',
                    textAlign: 'center',
                    padding: '2.5rem 0',
                }}
            >
                {t('forum.select_topic')}
            </div>
        );
    }

    const color = consensus ? (CONSENSUS_COLORS[consensus] ?? '#f59e0b') : '#f59e0b';

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 700 }}>
                    {thread.topic.title}
                </span>
                {consensus && (
                    <span
                        style={{
                            fontSize: '0.66rem',
                            border: `1px solid ${color}55`,
                            color,
                            borderRadius: 5,
                            padding: '0.1rem 0.4rem',
                        }}
                    >
                        {t(`forum.consensus_${consensus}`)}
                    </span>
                )}
                <span style={{ fontSize: '0.68rem', color: '#64748b', marginLeft: 'auto' }}>
                    {thread.topic.postCount} {t('forum.posts')}
                </span>
                {onInviteAgents && (
                    <button
                        onClick={onInviteAgents}
                        disabled={inviting}
                        style={{
                            padding: '0.3rem 0.7rem',
                            borderRadius: 6,
                            border: '1px solid rgba(139,92,246,0.3)',
                            background: inviting ? 'rgba(139,92,246,0.1)' : 'transparent',
                            color: inviting ? '#8b5cf6' : '#94a3b8',
                            cursor: inviting ? 'default' : 'pointer',
                            fontSize: '0.68rem',
                            fontWeight: 600,
                        }}
                    >
                        {inviting ? t('forum.inviting') : t('forum.invite_agents')}
                    </button>
                )}
            </div>

            {thread.posts.length === 0 && (
                <div
                    style={{
                        fontSize: '0.72rem',
                        color: '#475569',
                        textAlign: 'center',
                        padding: '1.5rem 0',
                    }}
                >
                    {t('forum.no_posts')}
                </div>
            )}

            {thread.posts.map((p) => (
                <PostCard key={p.id} post={p} onModerate={onModerate} />
            ))}

            <PostComposer onSubmit={onCompose} />
        </div>
    );
};

const iconBtnSmall: React.CSSProperties = {
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '0.7rem',
    padding: '0 2px',
};

export default TopicView;
