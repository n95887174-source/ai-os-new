/**
 * SecurityService - Legacy re-export layer
 * Implementation lives in src/kernel/security.ts
 */

export { SecurityService } from '../kernel/security';
import { SecurityService as KernelSecurity } from '../kernel/security';
export const securityService = new KernelSecurity();
