import React from 'react';
import { ChevronRight } from 'lucide-react';
import { NAV_SECTIONS } from '../../route-registry';
import type { TranslationKey } from '../../i18n/translations';

interface BreadcrumbsProps {
  path: string;
  t: (key: TranslationKey) => string;
}

function getCrumbs(path: string, t: (key: TranslationKey) => string): Array<{ label: string; path: string }> {
  const segments = path.replace(/^\//, '').split('/').filter(Boolean);
  if (segments.length === 0) segments.push('dashboard');
  const id = segments[0];
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.id === id) {
        return [
          { label: t(section.labelKey), path: '#' },
          { label: t(item.labelKey), path: `/${item.id}` },
        ];
      }
    }
  }
  return [{ label: id, path: `/${id}` }];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ path, t }) => {
  const crumbs = getCrumbs(path, t);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
      {crumbs.map((crumb, i) => (
        <React.Fragment key={crumb.path}>
          {i > 0 && <ChevronRight size={12} style={{ opacity: 0.4 }} />}
          <span style={{ opacity: i === crumbs.length - 1 ? 1 : 0.6, fontWeight: i === crumbs.length - 1 ? 700 : 400 }}>
            {crumb.label}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};
