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
 * It also isolates mixed numbers ("2 1/3") as a single run.
 * and wraps each run in <bdi dir="ltr" style={{unicodeBidi:'isolate'}}>
 */

const OPERAND = String.raw`(?:\d+(?:[.,]\d+)?|\?)`;
/** A mixed number: whole part, space, fraction — "2 1/3". Must isolate as ONE
 *  run, or RTL puts the whole number on the wrong side of its fraction. */
const MIXED = String.raw`\d+\s+\d+\s*/\s*\d+`;
/** A signed number: "−3". Alone in RTL text the sign drifts to the wrong side
 *  and the child reads "3−". Negative numbers are a grade-4 unit, so isolate.
 *
 *  Only the true minus (U+2212), never the ASCII hyphen: Hebrew attaches
 *  prefixes with a hyphen ("ל-3/8", "ב-5"), and matching those turned a
 *  fraction into "minus three". Item text writes negatives with −. */
const SIGNED = String.raw`−\d+°?`;
/** A temperature: the degree sign must travel INSIDE the isolate, or RTL puts
 *  it on the far side of its number and "−7°" reaches her as "°−7". */
const DEGREES = String.raw`\d+°`;
/** A bracketed sub-expression, e.g. "(4 + 3)". */
const GROUP = String.raw`\(\s*${OPERAND}(?:\s*[+\-−×÷/]\s*${OPERAND})+\s*\)`;
const TERM  = `(?:${GROUP}|${OPERAND})`;
/**
 * A whole expression, brackets included. The brackets MUST be inside the
 * isolate: left outside, RTL mirrors the glyphs, and "20 − (4 + 3)" reached the
 * child with its parentheses facing the wrong way (seen in QA, 2026-09-20).
 */
const EXPR = `${TERM}(?:\\s*[+\\-−×÷=<>/]\\s*${TERM})+`;

const MATH_RUN = new RegExp(`(${MIXED}|${EXPR}|${SIGNED}|${DEGREES})`, 'g');

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
