import type { IAuthorizationService, KernelUserLevel } from '../contracts/authorization';
import { LEVEL_RANK, PermissionDeniedError } from '../contracts/authorization';
import { rootLogger } from './logger-service';

const LOGGER = rootLogger.child('AuthorizationService');

export class AuthorizationService implements IAuthorizationService {
    private _currentLevel: KernelUserLevel = 'L0';

    getLevel(): KernelUserLevel {
        return this._currentLevel;
    }

    setLevel(level: KernelUserLevel): void {
        LOGGER.info('AuthorizationService', 'setLevel', { from: this._currentLevel, to: level });
        this._currentLevel = level;
    }

    requireLevel(minimum: KernelUserLevel): void {
        if (LEVEL_RANK[this._currentLevel] < LEVEL_RANK[minimum]) {
            LOGGER.warn('AuthorizationService', 'Permission denied', {
                required: minimum,
                current: this._currentLevel,
            });
            throw new PermissionDeniedError(minimum, this._currentLevel);
        }
    }

    can(minimum: KernelUserLevel): boolean {
        return LEVEL_RANK[this._currentLevel] >= LEVEL_RANK[minimum];
    }
}
