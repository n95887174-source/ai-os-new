import React from 'react';
import { AppLayout } from './components/AppLayout';
import { AuthLevelSync } from './components/Common/AuthLevelSync';

const App: React.FC = () => {
    return (
        <>
            <AuthLevelSync />
            <AppLayout />
        </>
    );
};

export default App;
