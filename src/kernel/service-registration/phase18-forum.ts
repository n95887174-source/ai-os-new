/**
 * Phase 18 — Agent Forum.
 *
 * Registers the Agent Forum (async persistent threads) service and wires the
 * event bridge: debate verdicts → "case study" posts, crystal formation →
 * announcements (plan §6.2).
 * Depends on phase 0 (dal + eventBus).
 */
import type { Phase } from './helpers';
import type { IContainer } from '../container';
import type { IEventBus } from '../types/interfaces';
import type { IForumService } from '../contracts/forum';
import type { DataAccessLayer } from '../dal';
import type { ForumAuthor } from '../types/forum-types';
import { ForumService } from '../services/forum/forum-service';
import { EVENTS } from '../events/event-names';
import { rootLogger } from '../services/logger-service';

const LOGGER = rootLogger.child('ForumBridge');

const SYSTEM_AUTHOR: ForumAuthor = { kind: 'agent', id: 'system', displayName: 'Система' };

export const registerPhase18: Phase = ({ register }) => {
    register('forumService', (c: IContainer) => {
        const forum = new ForumService({
            repository: c.get<DataAccessLayer>('dal').forum,
            eventBus: c.get<IEventBus>('eventBus'),
        });
        wireForumBridge(c.get<IEventBus>('eventBus'), forum);
        return forum;
    });
};

function wireForumBridge(eventBus: IEventBus, forum: IForumService): void {
    eventBus.onSafe<{ sessionId?: string; verdict?: unknown }>(
        EVENTS.DEBATE_VERDICT_GENERATED,
        (data) => {
            void (async () => {
                try {
                    const topicId = await ensureTopic(forum, 'case-study', 'Кейсы дебатов');
                    await forum.postMessage(
                        topicId,
                        SYSTEM_AUTHOR,
                        `Итог дебатов ${data.sessionId ?? '—'}: зафиксирован вердикт (авто-пост).`,
                    );
                } catch (e) {
                    LOGGER.warn('ForumBridge', 'failed to post debate verdict', { error: e });
                }
            })();
        },
    );

    eventBus.onSafe<{ crystalId?: string; statement?: string }>(EVENTS.CRYSTAL_FORMED, (data) => {
        void (async () => {
            try {
                const topicId = await ensureTopic(forum, 'announcements', 'Анонсы кристаллов');
                await forum.postMessage(
                    topicId,
                    SYSTEM_AUTHOR,
                    `Сформирован кристалл ${data.crystalId ?? ''}: ${(data.statement ?? '').slice(0, 240)}`,
                );
            } catch (e) {
                LOGGER.warn('ForumBridge', 'failed to post crystal announcement', { error: e });
            }
        })();
    });
}

async function ensureTopic(forum: IForumService, category: string, title: string): Promise<string> {
    const page = await forum.listTopics({ category });
    if (page.items.length > 0) return page.items[0]!.id;
    return forum.createTopic({ title, category, author: SYSTEM_AUTHOR });
}
