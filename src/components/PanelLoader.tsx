import React from 'react';

interface PanelLoaderProps {
  title?: string;
  children: React.ReactNode;
}

const PanelLoader: React.FC<PanelLoaderProps> = ({ title, children }) => {
  return (
    <div style={{ padding: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
      {title && (
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0' }}>{title}</h2>
        </div>
      )}
      {children}
    </div>
  );
};

export default PanelLoader;
