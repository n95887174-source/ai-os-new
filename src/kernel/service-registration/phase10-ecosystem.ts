import type { Phase } from './helpers';
import { EcosystemEngine } from '../services/ecosystem-engine';
import { BucketStorageAdapter } from '../storage-adapter-instance';

export const registerPhase10: Phase = ({ register }) => {
    const storage = BucketStorageAdapter;
    register('ecosystemEngine', new EcosystemEngine({ storage }));
};
