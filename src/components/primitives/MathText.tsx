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
 * It detects runs of: operand [op operand]+
 * where operand ∈ { number, ? }  (the ? lets missing-factor equations like
 * "7 × ? = 42" or "? × 6 = 42" stay left-to-right instead of being reordered
 * by the RTL bidi algorithm into "42 × ? = 7")
 * and op ∈ { + − - × ÷ = < > / }
 * and wraps each run in <bdi dir="ltr" style={{unicodeBidi:'isolate'}}>
 */

const OPERAND = String.raw`(?:\d+(?:[.,]\d+)?|\?)`;
const MATH_RUN = new RegExp(
  `(${OPERAND}(?:\\s*[+\\-−×÷=<>/]\\s*${OPERAND})+)`,
  'g',
);

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
