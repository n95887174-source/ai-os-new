import type { ISecurityService } from './types/interfaces';
import { storageAdapter } from './instances';

export class SecurityService implements ISecurityService {
  private masterKey: CryptoKey | null = null;
  private readonly ALGO = 'AES-GCM';

  private failedAttempts = new Map<string, { count: number; lastAttempt: number }>();
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly BACKOFF_BASE_MS = 1000;

  private checkRateLimit(userId: string): void {
    const record = this.failedAttempts.get(userId);
    if (!record) return;
    if (record.count >= this.MAX_FAILED_ATTEMPTS) {
      const elapsed = Date.now() - record.lastAttempt;
      const backoffMs = Math.min(this.BACKOFF_BASE_MS * Math.pow(2, record.count - this.MAX_FAILED_ATTEMPTS), 300000);
      if (elapsed < backoffMs) {
        const waitSec = Math.ceil((backoffMs - elapsed) / 1000);
        throw new Error(`Too many failed attempts. Try again in ${waitSec} seconds.`);
      }
      this.failedAttempts.delete(userId);
    }
  }

  private recordFailedAttempt(userId: string): void {
    const record = this.failedAttempts.get(userId) || { count: 0, lastAttempt: 0 };
    record.count++;
    record.lastAttempt = Date.now();
    this.failedAttempts.set(userId, record);
  }

  private clearFailedAttempts(userId: string): void {
    this.failedAttempts.delete(userId);
  }

  async initialize(password: string, userId: string = 'default'): Promise<boolean> {
    try {
      this.checkRateLimit(userId);
      const encoder = new TextEncoder();
      storageAdapter.setItem('active_user_id', userId);
      const salt = await this.getSalt(userId, true);
      const baseKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
      );

      this.masterKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: this.toArrayBuffer(salt),
          iterations: 600000,
          hash: 'SHA-256'
        },
        baseKey,
        { name: this.ALGO, length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      this.clearFailedAttempts(userId);
      return true;
    } catch (e) {
      this.recordFailedAttempt(userId);
      console.error('[Security] Failed to derive key:', e);
      return false;
    }
  }

  async changePassword(
    oldPassword: string,
    newPassword: string,
    userId: string = 'default',
    reEncrypt?: (encrypt: (plain: string) => Promise<string | null>) => Promise<boolean>,
  ): Promise<boolean> {
    // Always verify old password, even if already unlocked
    const ok = await this.initialize(oldPassword, userId);
    if (!ok) return false;

    const oldKey = this.masterKey!;
    const newSalt = crypto.getRandomValues(new Uint8Array(16));
    const encoder = new TextEncoder();

    const baseKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(newPassword),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const newMasterKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: this.toArrayBuffer(newSalt),
        iterations: 600000,
        hash: 'SHA-256'
      },
      baseKey,
      { name: this.ALGO, length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    if (reEncrypt) {
      const encryptWithNew = (plain: string) => this.encryptWithKey(plain, newMasterKey);
      const ok = await reEncrypt(encryptWithNew);
      if (!ok) return false;
    }

    const saltKey = `vault_salt_${userId}`;
    const hex = Array.from(newSalt).map(b => b.toString(16).padStart(2, '0')).join('');
    storageAdapter.setItem(saltKey, hex);

    this.masterKey = newMasterKey;
    return true;
  }

  private async encryptWithKey(text: string, key: CryptoKey): Promise<string | null> {
    try {
      const encoder = new TextEncoder();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: this.ALGO, iv },
        key,
        encoder.encode(text)
      );

      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      let binary = '';
      for (let i = 0; i < combined.length; i++) {
        binary += String.fromCharCode(combined[i]);
      }
      return btoa(binary);
    } catch (e) {
      console.error('[Security] Encryption with specific key failed:', e);
      return null;
    }
  }

  async encrypt(text: string): Promise<string | null> {
    if (!this.masterKey) return null;
    try {
      const encoder = new TextEncoder();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: this.ALGO, iv },
        this.masterKey,
        encoder.encode(text)
      );

      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      let binary = '';
      for (let i = 0; i < combined.length; i++) {
        binary += String.fromCharCode(combined[i]);
      }
      return btoa(binary);
    } catch (e) {
      console.error('[Security] Encryption failed:', e);
      return null;
    }
  }

  async decrypt(base64: string): Promise<string | null> {
    if (!this.masterKey) return null;
    try {
      const combined = new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)));
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        { name: this.ALGO, iv },
        this.masterKey,
        ciphertext
      );

      return new TextDecoder().decode(decrypted);
    } catch (e) {
      console.error('[Security] Decryption failed:', e);
      return null;
    }
  }

  isLocked(): boolean {
    return this.masterKey === null;
  }

  lock(): void {
    this.masterKey = null;
  }

  private saltCache = new Map<string, Uint8Array>();
  private static readonly SALT_CACHE_MAX = 100;

  private pruneSaltCache(): void {
    if (this.saltCache.size >= SecurityService.SALT_CACHE_MAX) {
      const first = this.saltCache.keys().next();
      if (!first.done) this.saltCache.delete(first.value);
    }
  }

  private async getSalt(userId: string, persist = false): Promise<Uint8Array> {
    const cached = this.saltCache.get(userId);
    if (cached) return cached;

    const saltKey = `vault_salt_${userId}`;
    const stored = (persist ? localStorage : sessionStorage).getItem(saltKey);
    if (stored) {
      const hex = stored.match(/.{1,2}/g) || [];
      const bytes = new Uint8Array(hex.map(h => parseInt(h, 16)));
      this.saltCache.set(userId, bytes);
      return bytes;
    }

    this.pruneSaltCache();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    this.saltCache.set(userId, salt);
    const hex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    if (persist) storageAdapter.setItem(saltKey, hex);
    else sessionStorage.setItem(saltKey, hex);
    return salt;
  }

  private clearSaltCache(): void {
    this.saltCache.clear();
  }

  private toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
  }
}

export const securityService = new SecurityService();
