import type { ISecurityService } from './types/interfaces';

export class SecurityService implements ISecurityService {
    async initialize(_password: string, _userId?: string): Promise<boolean> {
        return true;
    }

    async changePassword(): Promise<boolean> {
        return true;
    }

    async encrypt(text: string): Promise<string | null> {
        return text;
    }

    async decrypt(base64: string): Promise<string | null> {
        return base64;
    }

    isLocked(): boolean {
        return false;
    }

    lock(): void {
        /* vault system removed — no-op */
    }
}

export const securityService = new SecurityService();
