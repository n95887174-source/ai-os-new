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
}

const CONSENSUS_COLORS: Record<string, string> = {
    consensus: '#10b981',
    contested: '#ef4444',
    open: '#f59e0b',
};

function buildThreadMarkdown(thread: { topic: Topic; posts: Post[] }): string {
    const lines: string[] = [];
    lines.push(`# ${thread.topic.title}`);
    lines.push('');
    lines.push(`*Category: ${thread.topic.category} — ${thread.posts.length} posts*`);
    lines.push('');
    lines.push('---');
    lines.push('');
    const sorted = [...thread.posts].sort((a, b) => a.createdAt - b.createdAt);
    for (const p of sorted) {
        const name = p.author?.displayName ?? p.author?.id ?? 'unknown';
        const date = new Date(p.createdAt).toISOString();
        if (p.parentId) lines.push(`> reply to ${p.parentId}`);
        lines.push(`**${name}** — ${date}`);
        lines.push('');
        lines.push(p.body);
        lines.push('');
        lines.push('---');
        lines.push('');
    }
    return lines.join('\n');
}

function downloadMarkdown(filename: string, content: string): void {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

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
const TopicView: React.FC<TopicViewProps> = ({ thread, consensus, onModerate, onCompose }) => {
    const { t } = useTranslation();
    const [postFilter, setPostFilter] = React.useState('');

    React.useEffect(() => {
        setPostFilter('');
    }, [thread?.topic.id]);

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
                <span
                    style={{
                        fontSize: '0.68rem',
                        color: '#64748b',
                        marginLeft: 'auto',
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                    }}
                >
                    <button
                        onClick={() =>
                            downloadMarkdown(
                                `forum-${(thread.topic.title ?? 'topic').slice(0, 50).replace(/[^a-z0-9]/gi, '_')}.md`,
                                buildThreadMarkdown(thread),
                            )
                        }
                        title={t('forum.export_md')}
                        style={exportBtn}
                    >
                        ⬇ {t('forum.export_md')}
                    </button>
                    {thread.topic.postCount} {t('forum.posts')}
                </span>
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

            <div style={{ marginBottom: 8 }}>
                <input
                    value={postFilter}
                    onChange={(e) => setPostFilter(e.target.value)}
                    placeholder={t('common.search')}
                    style={searchInput}
                />
            </div>

            {thread.posts
                .filter((p) =>
                    postFilter.trim() === ''
                        ? true
                        : (p.body + ' ' + (p.author?.displayName ?? ''))
                              .toLowerCase()
                              .includes(postFilter.toLowerCase()),
                )
                .sort((a, b) => a.createdAt - b.createdAt) // Sort by time first
                .map((p) => (
                    <div key={p.id} style={{ paddingLeft: p.parentId ? '1.5rem' : 0 }}>
                        <PostCard post={p} onModerate={onModerate} />
                    </div>
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

const exportBtn: React.CSSProperties = {
    border: '1px solid rgba(139,92,246,0.3)',
    background: 'rgba(139,92,246,0.1)',
    color: '#c4b5fd',
    cursor: 'pointer',
    fontSize: '0.66rem',
    borderRadius: 6,
    padding: '0.2rem 0.5rem',
};

const searchInput: React.CSSProperties = {
    width: '100%',
    background: '#0f172a',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    color: '#e2e8f0',
    fontSize: '0.7rem',
    padding: '0.32rem 0.55rem',
};

export default TopicView;
