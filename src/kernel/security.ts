import type { ISecurityService } from './types/interfaces';
import { BucketStorageAdapter } from './storage-adapter-instance';
import { rootLogger } from './services/logger-service';
const LOGGER = rootLogger.child('Security');

export class SecurityService implements ISecurityService {
  private masterKey: CryptoKey | null = null;
  private readonly ALGO = 'AES-GCM';

  private failedAttempts = new Map<string, { count: number; lastAttempt: number }>();
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly MAX_TRACKED_USERS = 1000;
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
    // K-11: Cap tracked users to prevent unbounded memory growth
    if (this.failedAttempts.size >= this.MAX_TRACKED_USERS && !this.failedAttempts.has(userId)) {
      const oldest = this.failedAttempts.keys().next().value;
      if (oldest) this.failedAttempts.delete(oldest);
    }
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
      BucketStorageAdapter.setItem('active_user_id', userId);
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
      // K-12: Don't count rate-limit rejections as failed key derivation
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('Too many failed attempts')) {
        this.recordFailedAttempt(userId);
      }
      LOGGER.error('Security', 'Failed to derive key', { error: e });
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

    const saltKey = `vault_salt_${userId}`;
    const hex = Array.from(newSalt).map(b => b.toString(16).padStart(2, '0')).join('');
    const previousSalt = BucketStorageAdapter.getItem(saltKey);

    if (reEncrypt) {
      const encryptWithNew = (plain: string) => this.encryptWithKey(plain, newMasterKey);
      const encryptWithOld = (plain: string) => this.encryptWithKey(plain, oldKey);
      const reEncrypted = await reEncrypt(encryptWithNew);
      if (!reEncrypted) return false;
      try {
        BucketStorageAdapter.setItem(saltKey, hex);
      } catch (e) {
        LOGGER.error('Security', 'Failed to persist salt after re-encryption, attempting rollback', { error: e });
        try {
          await reEncrypt(encryptWithOld);
          if (previousSalt) BucketStorageAdapter.setItem(saltKey, previousSalt);
          else BucketStorageAdapter.removeItem(saltKey);
        } catch (rollbackError) {
          LOGGER.error('Security', 'Password change rollback failed', { error: rollbackError });
        }
        return false;
      }
    } else {
      LOGGER.warn('Security', 'changePassword called without reEncrypt — previously encrypted data will become unrecoverable after this operation');
      BucketStorageAdapter.setItem(saltKey, hex);
    }

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
      LOGGER.error('Security', 'Encryption with specific key failed', { error: e });
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
      LOGGER.error('Security', 'Encryption failed', { error: e });
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
      LOGGER.error('Security', 'Decryption failed', { error: e });
      return null;
    }
  }

  isLocked(): boolean {
    return this.masterKey === null;
  }

  lock(): void {
    this.masterKey = null;
    this.clearSaltCache();
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
    const stored = BucketStorageAdapter.getItem(saltKey);
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
    if (persist) BucketStorageAdapter.setItem(saltKey, hex);
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
