import React from 'react';
import { motion } from 'framer-motion';
import type { ApiKey } from '../../types/metrics';
import UsageChart from './UsageChart';

interface QualityTabProps {
  stats: ApiKey['stats']['extended'];
}

const QualityTab: React.FC<QualityTabProps> = ({ stats }) => {
  if (!stats) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        No usage data available yet
      </motion.div>
    );
  }

  return (
    <UsageChart
      hourlyUsage={stats.hourlyUsage}
      usageToday={stats.usageToday}
      usageMonthly={stats.usageMonthly}
      fourSignals={stats.fourSignals}
    />
  );
};

export default QualityTab;
