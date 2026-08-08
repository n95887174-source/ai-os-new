import React from 'react';
import { useTranslation } from '../../i18n/useTranslation';

interface PostComposerProps {
    onSubmit: (body: string) => void;
}

/**
 * PostComposer — new post input for the selected topic.
 */
const PostComposer: React.FC<PostComposerProps> = ({ onSubmit }) => {
    const { t } = useTranslation();
    const [body, setBody] = React.useState('');

    const submit = (): void => {
        if (!body.trim()) return;
        onSubmit(body.trim());
        setBody('');
    };

    return (
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        submit();
                    }
                }}
                placeholder={t('forum.composer_placeholder')}
                rows={2}
                style={{
                    flex: 1,
                    background: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#e2e8f0',
                    fontSize: '0.75rem',
                    padding: '0.5rem 0.7rem',
                    resize: 'none',
                }}
            />
            <button
                onClick={submit}
                disabled={!body.trim()}
                style={{
                    alignSelf: 'flex-end',
                    padding: '0.45rem 0.9rem',
                    borderRadius: 7,
                    border: 'none',
                    background: '#8b5cf6',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    opacity: body.trim() ? 1 : 0.5,
                }}
            >
                {t('forum.post')}
            </button>
        </div>
    );
};

export default PostComposer;
