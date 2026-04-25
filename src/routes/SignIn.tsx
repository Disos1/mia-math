import { useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Parent-facing auth gate — shown once per device.
 *
 * Flow:
 *   1. Parent enters their email address.
 *   2. Supabase sends a magic link to that address.
 *   3. Parent clicks the link (in the same browser).
 *   4. onAuthStateChange in App.tsx fires → app proceeds automatically.
 *
 * The child never sees this screen after the first sign-in on a device
 * (Supabase persists the session in localStorage).
 */
export function SignIn() {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    const { error: err } = await supabase.auth.signInWithOtp({
      email:   email.trim(),
      options: {
        shouldCreateUser: true,
        // Redirect back to this app (works for both localhost and GitHub Pages)
        emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
      },
    });

    setLoading(false);
    if (err) {
      setError('לא הצלחנו לשלוח אמייל. נסו שוב.');
      console.error('[SignIn]', err.message);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center fade-in"
        dir="rtl"
      >
        <div className="text-7xl mb-6">📬</div>
        <h1 className="text-2xl font-bold text-[#2D3047] mb-3">נשלח אמייל!</h1>
        <p className="text-gray-500 text-lg leading-relaxed max-w-xs">
          לחצו על הקישור שנשלח ל-
          <span className="font-semibold text-[#2D3047] break-all"> {email}</span>
        </p>
        <p className="text-gray-400 text-sm mt-6 max-w-xs">
          אחרי שלחצתם על הקישור — האפליקציה תמשיך אוטומטית
        </p>
        <button
          onClick={() => setSent(false)}
          className="mt-8 text-sm text-gray-400 underline"
        >
          שלחו שוב
        </button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      dir="rtl"
    >
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-[#2D3047] mb-2">כניסה להורים</h1>
          <p className="text-gray-500 leading-relaxed">
            הכניסו את כתובת האמייל שלכם.
            <br />
            נשלח לכם קישור כניסה חד-פעמי.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-lg text-left outline-none focus:border-[#C4A7E7] transition-colors"
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
            className="w-full bg-[#C4A7E7] text-white font-bold text-lg rounded-2xl py-4 disabled:opacity-50 transition-opacity active:scale-95"
          >
            {loading ? '...שולח' : 'שלחו קישור כניסה'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-300 mt-8">
          הקישור בטוח ותקף ל-24 שעות
        </p>
      </div>
    </div>
  );
}
