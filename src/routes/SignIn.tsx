import { useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Parent-facing auth gate — shown once per device.
 *
 * Flow:
 *   1. Parent enters email → Supabase sends an email with BOTH a magic link
 *      AND a 6-digit code.
 *   2a. Magic link: clicking it in the same browser signs in automatically.
 *   2b. Code: typing the 6 digits here works in any tab/browser — the reliable
 *       path for incognito windows or when the email client opens a different browser.
 */
export function SignIn() {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // ── Step 1: send the OTP email ─────────────────────────────────────────────

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    const { error: err } = await supabase.auth.signInWithOtp({
      email:   email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo:  window.location.origin + import.meta.env.BASE_URL,
      },
    });

    setLoading(false);
    if (err) {
      setError('לא הצלחנו לשלוח אמייל. נסו שוב.');
      console.error('[SignIn] send:', err.message);
    } else {
      setSent(true);
      setCode('');
    }
  };

  // ── Step 2: verify the 6-digit code ───────────────────────────────────────

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.replace(/\s/g, '');
    if (token.length < 6) return;
    setLoading(true);
    setError(null);

    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type:  'email',
    });

    setLoading(false);
    if (err) {
      setError('קוד שגוי או פג תוקף. נסו שוב.');
      console.error('[SignIn] verify:', err.message);
    }
    // On success onAuthStateChange in App.tsx fires automatically — no navigation needed here.
  };

  // ── Waiting-for-code screen ────────────────────────────────────────────────

  if (sent) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center fade-in"
        dir="rtl"
      >
        <div className="text-7xl mb-6">📬</div>
        <h1 className="text-2xl font-bold text-[#2D3047] mb-2">נשלח קוד!</h1>
        <p className="text-gray-500 text-base leading-relaxed max-w-xs mb-6">
          שלחנו קוד כניסה בן 6 ספרות ל-
          <span className="font-semibold text-[#2D3047] break-all"> {email}</span>
        </p>

        <form onSubmit={handleVerify} className="w-full max-w-xs flex flex-col gap-3">
          <p className="text-sm font-semibold text-gray-700">
            הכניסו את הקוד מהאמייל:
          </p>
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={e => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
            placeholder="_ _ _ _ _ _ _ _"
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3
              text-2xl text-center tracking-[0.3em] font-bold outline-none
              focus:border-[#C4A7E7] transition-colors"
            autoFocus
          />

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full bg-[#C4A7E7] text-white font-bold text-lg rounded-2xl py-3
              disabled:opacity-50 transition-opacity active:scale-95"
          >
            {loading ? '...מאמת' : 'כניסה ✓'}
          </button>
        </form>

        <button
          onClick={() => { setSent(false); setError(null); }}
          className="mt-8 text-sm text-gray-400 underline"
        >
          שלחו שוב
        </button>
      </div>
    );
  }

  // ── Email entry screen ────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      dir="rtl"
    >
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="text-7xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-[#2D3047] mb-2">כניסה להורים</h1>
          <p className="text-gray-500 leading-relaxed">
            הכניסו את כתובת האמייל שלכם.
            <br />
            נשלח קוד כניסה בן 6 ספרות.
          </p>
        </div>

        <form onSubmit={handleSend} className="flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3
              text-lg text-left outline-none focus:border-[#C4A7E7] transition-colors"
            dir="ltr"
            autoComplete="email"
            autoFocus
          />

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full bg-[#C4A7E7] text-white font-bold text-lg rounded-2xl py-4
              disabled:opacity-50 transition-opacity active:scale-95"
          >
            {loading ? '...שולח' : 'שלחו קוד כניסה'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-300 mt-8">
          הקוד תקף ל-60 דקות
        </p>
      </div>
    </div>
  );
}
