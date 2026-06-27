import { useRef } from 'react';

export function useLatestRef<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  // eslint-disable-next-line react-hooks/refs
  ref.current = value;
  return ref;
}
