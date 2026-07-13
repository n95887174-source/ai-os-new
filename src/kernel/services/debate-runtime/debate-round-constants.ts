import { CONFIG } from '../config-registry';

export const ROUND_DELAY_MS = CONFIG?.services?.debate?.roundDelayMs ?? 1000;
