/**
 * SecurityService - Handles client-side encryption for sensitive data (API Keys)
 * Uses Web Crypto API for industrial-grade protection.
 */

class SecurityService {
  private masterKey: CryptoKey | null = null;
  private readonly ALGO = 'AES-GCM';

  /**
   * Derive a CryptoKey from a plaintext password
   */
  async initialize(password: string): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const userId = localStorage.getItem('active_user_id') || 'default';
      const salt = await this.getSalt(password, userId);
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
          salt: salt.buffer as ArrayBuffer,
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

      // Combine IV and Ciphertext for storage
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

  lock() {
    this.masterKey = null;
  }

  private async getSalt(password: string, userId: string): Promise<Uint8Array> {
    const savedKey = `vault_salt_${userId}`;
    const saved = localStorage.getItem(savedKey);
    if (saved) {
      return new Uint8Array(atob(saved).split('').map(c => c.charCodeAt(0)));
    }

    // Generate cryptographically random salt and store it alongside ciphertext
    const salt = crypto.getRandomValues(new Uint8Array(16));
    localStorage.setItem(savedKey, btoa(String.fromCharCode(...salt)));
    return salt;
  }
}

export const securityService = new SecurityService();
