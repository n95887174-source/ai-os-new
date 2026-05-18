import type { ISecurityService } from './types/interfaces';

export class SecurityService implements ISecurityService {
  private masterKey: CryptoKey | null = null;
  private readonly ALGO = 'AES-GCM';

  async initialize(password: string, userId: string = 'default'): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      localStorage.setItem('active_user_id', userId);
      const salt = await this.getSalt(userId);
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

      return true;
    } catch (e) {
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
    if (this.isLocked()) {
      const ok = await this.initialize(oldPassword, userId);
      if (!ok) return false;
    }

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
      const encryptWithNew = async (plain: string) => {
        this.masterKey = newMasterKey;
        const result = await this.encrypt(plain);
        this.masterKey = oldKey;
        return result;
      };
      const ok = await reEncrypt(encryptWithNew);
      if (!ok) return false;
    }

    const saltKey = `vault_salt_${userId}`;
    localStorage.setItem(saltKey, btoa(String.fromCharCode(...newSalt)));

    this.masterKey = newMasterKey;
    return true;
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

  private async getSalt(userId: string): Promise<Uint8Array> {
    const savedKey = `vault_salt_${userId}`;
    const saved = localStorage.getItem(savedKey);
    if (saved) {
      return new Uint8Array(atob(saved).split('').map(c => c.charCodeAt(0)));
    }

    const salt = crypto.getRandomValues(new Uint8Array(16));
    localStorage.setItem(savedKey, btoa(String.fromCharCode(...salt)));
    return salt;
  }

  private toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
  }
}
