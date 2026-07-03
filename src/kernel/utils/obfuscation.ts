// REMOVED: XOR+base64 obfuscation created false sense of security.
// All sensitive data now uses AES-GCM-256 via SecurityService.
// Legacy deobfuscation kept for backward-compatible reads of old data.
export const OBFUSCATION_PREFIX = 'xob:';

function legacyDeobfuscate(encoded: string): string | null {
    try {
        const salt = 'a1b2c3d4e5f6g7h8';
        const text = atob(encoded);
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
        }
        return result;
    } catch {
        return null;
    }
}

export function createObfuscation(_salt: string) {
    return { obfuscate: (text: string) => text, deobfuscate: legacyDeobfuscate };
}
