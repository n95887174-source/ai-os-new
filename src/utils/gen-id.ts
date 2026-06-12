let counter = 0;

export function genId(prefix = ''): string {
  counter = (counter + 1) >>> 0;
  return `${prefix}${prefix ? '-' : ''}${Date.now().toString(36)}-${counter.toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}
