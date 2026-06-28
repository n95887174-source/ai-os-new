export const OBFUSCATION_PREFIX = 'xob:';

export function createObfuscation(salt: string) {
    function obfuscate(text: string): string {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
        }
        return btoa(result);
    }

    function deobfuscate(encoded: string): string | null {
        try {
            const text = atob(encoded);
            let result = '';
            for (let i = 0; i < text.length; i++) {
                result += String.fromCharCode(
                    text.charCodeAt(i) ^ salt.charCodeAt(i % salt.length),
                );
            }
            return result;
        } catch {
            return null;
        }
    }

    return { obfuscate, deobfuscate };
}
