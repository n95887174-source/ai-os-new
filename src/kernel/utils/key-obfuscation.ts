// XOR+base64 obfuscation for API keys at rest (Dexie/SQLite)
// This is a stopgap obfuscation layer, not true encryption.
// Same pattern as the localStorage obfuscation in src/stores/useKeyStore.ts

export function obfuscateKey(plaintext: string): string {
  const chars = plaintext.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ (i % 256)));
  return btoa(chars.join(''));
}

export function deobfuscateKey(encoded: string): string {
  const chars = atob(encoded).split('');
  return chars.map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ (i % 256))).join('');
}
