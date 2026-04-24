import React from 'react';

/**
 * MathText — LTR isolate for math expressions inside Hebrew (RTL) text.
 *
 * Without this, "500 − 163" in an RTL flow renders as "163 − 500".
 * Every question string, option label, or caption that contains a math
 * expression (digits + operators) must pass through this component.
 *
 * Usage:
 *   <MathText>כמה זה 300 − 27?</MathText>
 *   <MathText>{item.question}</MathText>
 *
 * It detects runs of: number [op number]+
 * where op ∈ { + − - × ÷ = < > / }
 * and wraps each run in <bdi dir="ltr" style={{unicodeBidi:'isolate'}}>
 */

const MATH_RUN =
  /(\d+(?:[.,]\d+)?(?:\s*[+\-−×÷=<>/]\s*\d+(?:[.,]\d+)?)+)/g;

interface Props {
  children: string;
  className?: string;
}

export function MathText({ children, className }: Props) {
  const text = String(children);
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  MATH_RUN.lastIndex = 0; // reset stateful regex
  while ((match = MATH_RUN.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    parts.push(
      <bdi key={idx++} dir="ltr" style={{ unicodeBidi: 'isolate' }}>
        {match[0]}
      </bdi>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return <span className={className}>{parts}</span>;
}
