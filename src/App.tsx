import { useState, useCallback, useRef } from 'react';
import { loadProfile, createProfile, updateProfile, clearProfile } from './lib/profile';
import { AVATAR_BY_ID } from './constants/avatars';
import { ENTRY_ITEMS } from './constants/diagnosticItems';
import { computePhase1Signals, selectVerificationItems, classifyResults } from './lib/diagnosticEngine';
import { buildGapProfile } from './lib/gapProfile';
import type { Profile, Avatar, DiagnosticAttempt, SessionMode, DiagnosticItem as DiagnosticItemType } from './types';

import { Welcome }            from './routes/Welcome';
import { AvatarPicker }       from './routes/AvatarPicker';
import { DiagnosticIntro }    from './routes/DiagnosticIntro';
import { DiagnosticItem }     from './routes/DiagnosticItem';
import { DiagnosticResults }  from './routes/DiagnosticResults';
import { ModePicker }         from './routes/ModePicker';
import { Session }            from './routes/Session';
import { Parent }             from './routes/Parent';
import { TrophyRoom }         from './routes/TrophyRoom';

// ─── Screen names ─────────────────────────────────────────────────────────────
type Screen =
  | 'welcome'
  | 'avatarPicker'
  | 'diagIntro'
  | 'diagItem'
  | 'diagResults'
  | 'modePicker'
  | 'session'
  | 'trophyRoom'
  | 'parent';

export default function App() {
  // Profile — loaded from localStorage on mount
  const [profile, setProfile] = useState<Profile | null>(() => loadProfile());

  // Routing state
  const [screen, setScreen]           = useState<Screen>(() => {
    const p = loadProfile();
    if (!p) return 'welcome';
    if (!p.onboardingComplete) return 'diagIntro';
    return 'session';
  });
  const [parentReturn, setParentReturn] = useState<Screen>('welcome');

  // Diagnostic state
  const [diagIndex, setDiagIndex]       = useState(0);
  const [diagAttempts, setDiagAttempts] = useState<DiagnosticAttempt[]>([]);
  const [phase2Items, setPhase2Items]   = useState<DiagnosticItemType[] | null>(null);
  const [diagGaps, setDiagGaps]         = useState<string[]>([]);
  const [diagStrengths, setDiagStrengths] = useState<string[]>([]);
  const diagStartAt   = useRef<number>(0);
  const diagSessionId = useRef<string>('');

  // Session state — mode chosen in ModePicker, passed to Session
  const [sessionMode, setSessionMode] = useState<SessionMode>('time');

  // ── Navigation helpers ──────────────────────────────────────────────────────

  const openParent = useCallback(() => {
    setParentReturn(screen);
    setScreen('parent');
  }, [screen]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleAvatarPick = (avatar: Avatar) => {
    const p = createProfile(avatar.id);
    setProfile(p);
    setScreen('diagIntro');
  };

  const handleDiagStart = () => {
    diagStartAt.current   = Date.now();
    diagSessionId.current = crypto.randomUUID();
    setDiagIndex(0);
    setDiagAttempts([]);
    setPhase2Items(null);
    setDiagGaps([]);
    setDiagStrengths([]);
    setScreen('diagItem');
  };

  const handleDiagAnswer = (answer: string | number, timeToAnswerMs: number) => {
    const allItems: DiagnosticItemType[] = [...ENTRY_ITEMS, ...(phase2Items ?? [])];
    const item = allItems[diagIndex];

    const correct = answer === item.correct;
    const signatureHit =
      !correct && item.signature !== null && answer === item.signature
        ? item.signatureCode
        : null;

    const attempt: DiagnosticAttempt = {
      id:             crypto.randomUUID(),
      profileId:      profile?.profileId ?? '',
      sessionId:      diagSessionId.current,
      itemId:         item.itemId,
      skillCode:      item.skillCode,
      answer,
      correct,
      signatureHit,
      timeToAnswerMs,
      sequenceNumber: diagIndex,
      phase:          item.phase,
      createdAt:      new Date().toISOString(),
    };

    const next = [...diagAttempts, attempt];
    setDiagAttempts(next);

    // After the last entry item → compute verification items and advance
    if (diagIndex === ENTRY_ITEMS.length - 1) {
      const signals  = computePhase1Signals(next);
      const elapsed  = Date.now() - diagStartAt.current;
      const p2       = selectVerificationItems(signals, elapsed);
      setPhase2Items(p2);
      setDiagIndex(i => i + 1);
      return;
    }

    // After the last verification item → classify, persist, and go to results
    if (phase2Items !== null && diagIndex >= ENTRY_ITEMS.length + phase2Items.length - 1) {
      const entryAttempts = next.filter(a => a.phase === 'entry');
      const signals       = computePhase1Signals(entryAttempts);
      const { gaps, strengths } = classifyResults(next, signals);
      setDiagGaps(gaps);
      setDiagStrengths(strengths);

      // Persist immediately so parent dashboard can read it even before the CTA tap
      if (profile) {
        const gapProfile = buildGapProfile(next, signals, gaps, strengths, diagSessionId.current);
        const updated = updateProfile({
          diagnosticCompletedAt: new Date().toISOString(),
          diagnosticVersion:     1,
          gapProfileJson:        gapProfile,
        });
        setProfile(updated);
      }

      setScreen('diagResults');
      return;
    }

    setDiagIndex(i => i + 1);
  };

  const handleReset = () => {
    clearProfile();
    setProfile(null);
    setDiagIndex(0);
    setDiagAttempts([]);
    setPhase2Items(null);
    setDiagGaps([]);
    setDiagStrengths([]);
    setScreen('welcome');
  };

  const handleDiagComplete = () => {
    if (profile) {
      const updated = updateProfile({ onboardingComplete: true });
      setProfile(updated);
    }
    setScreen('modePicker');
  };

  // ── Rendering ──────────────────────────────────────────────────────────────

  const avatar: Avatar | null = profile
    ? (AVATAR_BY_ID[profile.avatarId] ?? null)
    : null;

  const renderScreen = () => {
    switch (screen) {

      case 'welcome':
        return (
          <Welcome
            onNext={() => setScreen('avatarPicker')}
            onParent={openParent}
          />
        );

      case 'avatarPicker':
        return (
          <AvatarPicker
            onPick={handleAvatarPick}
            onParent={openParent}
          />
        );

      case 'diagIntro':
        if (!avatar) return <Welcome onNext={() => setScreen('avatarPicker')} onParent={openParent} />;
        return (
          <DiagnosticIntro
            avatar={avatar}
            onStart={handleDiagStart}
            onParent={openParent}
          />
        );

      case 'diagItem': {
        if (!avatar) return null;
        const allItems: DiagnosticItemType[] = [...ENTRY_ITEMS, ...(phase2Items ?? [])];
        const item = allItems[diagIndex];
        if (!item) return null;
        return (
          <DiagnosticItem
            key={item.itemId}
            avatar={avatar}
            item={item}
            index={diagIndex}
            total={allItems.length}
            onAnswer={handleDiagAnswer}
          />
        );
      }

      case 'diagResults':
        if (!avatar) return null;
        return (
          <DiagnosticResults
            avatar={avatar}
            gaps={diagGaps}
            strengths={diagStrengths}
            onNext={handleDiagComplete}
            onParent={openParent}
          />
        );

      case 'modePicker':
        return (
          <ModePicker
            onPick={mode => { setSessionMode(mode); setScreen('session'); }}
            onParent={openParent}
          />
        );

      case 'session':
        if (!profile) return null;
        return (
          <Session
            key={profile.sessionsCompleted /* fresh composer state per session */}
            profile={profile}
            mode={sessionMode}
            onComplete={() => {
              // Reload profile so sessionsCompleted reflects the just-finished session
              const fresh = loadProfile();
              if (fresh) setProfile(fresh);
              setScreen('modePicker');
            }}
            onTrophyRoom={() => {
              // Reload first so the just-finished session is visible in the room
              const fresh = loadProfile();
              if (fresh) setProfile(fresh);
              setScreen('trophyRoom');
            }}
            onParent={openParent}
          />
        );

      case 'trophyRoom':
        return (
          <TrophyRoom
            profile={profile}
            onBack={() => setScreen('modePicker')}
          />
        );

      case 'parent':
        return (
          <Parent
            profile={profile}
            onBack={() => setScreen(parentReturn)}
            onReset={handleReset}
          />
        );

      default:
        return null;
    }
  };

  return <>{renderScreen()}</>;
}
