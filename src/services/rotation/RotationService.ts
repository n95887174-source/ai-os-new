import { resolve } from '../service-resolver';
import { RotationService as KernelRotationService } from '../../kernel/services/rotation-service';
export { KernelRotationService as RotationService };
export type { IRotationService, IKeyRotationManager } from '../../kernel/contracts/key-rotation';
export const rotationService = resolve<KernelRotationService>('rotationService');
