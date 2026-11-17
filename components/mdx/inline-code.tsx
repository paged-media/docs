import type { ReactNode } from 'react';

/** Text with `backticked` spans set as code (generated catalog notes carry Markdown code spans). */
export function withCode(text: string): ReactNode {
  const parts = text.split('`');
  if (parts.length < 3) return text;
  return parts.map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part));
}
