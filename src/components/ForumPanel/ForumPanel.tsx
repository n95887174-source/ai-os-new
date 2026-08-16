import React from 'react';
import { MessagesSquare } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import { forumService } from '../../kernel/instances/services-extras';
import { eventBus, EVENTS } from '../../kernel/instances';
import type { ForumAuthor, Post, Topic } from '../../kernel/types/forum-types';
import TopicList from './TopicList';
import TopicView from './TopicView';
import ModerationQueue from './ModerationQueue';
import ForumHeatmap from './ForumHeatmap';

const currentAuthor: ForumAuthor = {
    kind: 'human',
    id: 'local-user',
    displayName: 'Вы',
};

/**
 * ForumPanel — async persistent threads UI: topic list + thread view +
 * moderation + activity heatmap.
 */
const ForumPanel: React.FC = () => {
    const { t } = useTranslation();
    const [topics, setTopics] = React.useState<Topic[]>([]);
    const [selectedId, setSelectedId] = React.useState<string | null>(null);
    const [thread, setThread] = React.useState<{ topic: Topic; posts: Post[] } | null>(null);
    const [consensus, setConsensus] = React.useState<string | null>(null);
    const [heatmap, setHeatmap] = React.useState<Array<{ category: string; count: number }>>([]);

    const [page, setPage] = React.useState(0);

    const refreshTopics = React.useCallback(async () => {
        const pageData = await forumService.listTopics({ page, pageSize: 50 });
        setTopics(pageData.items);
        const counts = new Map<string, number>();
        for (const tp of pageData.items) {
            counts.set(tp.category, (counts.get(tp.category) ?? 0) + tp.postCount);
        }
        setHeatmap([...counts.entries()].map(([category, count]) => ({ category, count })));
    }, [page]);

    // Combined Effect for lifecycle + real-time
    React.useEffect(() => {
        void refreshTopics();
        const unsubs = [
            eventBus.onSafe(EVENTS.FORUM_TOPIC_CREATED, () => void refreshTopics()),
            eventBus.onSafe(EVENTS.FORUM_POST_ADDED, () => void refreshTopics()),
        ];
        return () => unsubs.forEach((u) => u());
    }, [refreshTopics]);

    const openThread = async (id: string): Promise<void> => {
        setSelectedId(id);
        const th = await forumService.getThread(id);
        setThread(th);
        const cv = await forumService.getConsensus(id);
        setConsensus(cv?.status ?? null);
    };

    const handleCreate = async (title: string, category: string): Promise<void> => {
        const id = await forumService.createTopic({ title, category, author: currentAuthor });
        await refreshTopics();
        await openThread(id);
    };

    const handleCompose = async (body: string): Promise<void> => {
        if (!selectedId) return;
        await forumService.postMessage(selectedId, currentAuthor, body);
        await openThread(selectedId);
        await refreshTopics();
    };

    const handleModerate = async (postId: string, action: string): Promise<void> => {
        if (!selectedId) return;
        await forumService.moderatePost(postId, action as 'hide' | 'remove' | 'warn', 'модерация');
        await openThread(selectedId);
    };

    return (
        <div
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '1rem 1.25rem 0.6rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MessagesSquare size={18} color="#8b5cf6" />
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                        {t('forum.title')}
                    </span>
                </div>
                <button
                    onClick={() => void refreshTopics()}
                    title={t('forum.refresh')}
                    style={{
                        padding: '0.45rem 0.8rem',
                        borderRadius: 7,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'transparent',
                        color: '#94a3b8',
                        cursor: 'pointer',
                    }}
                >
                    ↻
                </button>
            </div>

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                {/* Left: topics */}
                <div
                    style={{
                        width: 340,
                        overflowY: 'auto',
                        padding: '0.9rem 1rem',
                        borderRight: '1px solid rgba(255,255,255,0.05)',
                    }}
                >
                    <TopicList
                        topics={topics}
                        selectedId={selectedId}
                        onSelect={(id) => void openThread(id)}
                        onCreate={(title, cat) => void handleCreate(title, cat)}
                        page={page}
                        onPageChange={setPage}
                    />
                    <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: 6 }}>
                            {t('forum.heatmap_title')}
                        </div>
                        <ForumHeatmap categories={heatmap} />
                    </div>
                </div>

                {/* Right: thread */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.9rem 1rem' }}>
                    <TopicView
                        thread={thread}
                        consensus={consensus}
                        onModerate={(id, action) => void handleModerate(id, action)}
                        onCompose={(body) => void handleCompose(body)}
                    />
                    {thread && (
                        <ModerationQueue
                            posts={thread.posts}
                            onModerate={(id, action) => void handleModerate(id, action)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForumPanel;
