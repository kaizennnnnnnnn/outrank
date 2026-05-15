'use client';

import { useEffect, useRef, useState } from 'react';
import { Conversation } from '@elevenlabs/client';
import { auth } from '@/lib/firebase';

/**
 * Drop-in voice + text chat surface for the orb command center. Wraps
 * everything: ElevenLabs session lifecycle, daily cap enforcement,
 * transcript, typed input, and amplitude broadcasting.
 *
 * Parent owns one shared `audioLevelRef` and passes it here. While a
 * voice session is live, this component writes the current mic/TTS
 * volume into it ~60 times a second; the SoulOrb canvas reads it in
 * its render loop, so the orb itself glows brighter as the voice
 * speaks. No prop-driven re-renders involved.
 */

interface OrbVoicePanelProps {
  audioLevelRef: { current: number };
  voiceActiveRef?: { current: boolean };
}

type VoiceState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

interface UIMessage {
  role: 'user' | 'assistant';
  content: string;
  source: 'text' | 'voice' | 'voice-long-form';
  pending?: boolean;
  arrivedAt?: number;
}

const REORDER_WINDOW_MS = 3000;

/**
 * Inserts a user voice message into the transcript in correct
 * chronological order. ElevenLabs sometimes fires the agent's reply
 * BEFORE the user's transcript event arrives — if the last entry is a
 * very-recent assistant message (within ~3s) and there are at least
 * two messages in the log, we slip the user line in front of it. The
 * length>=2 guard keeps us from displacing the session greeting.
 */
function insertUserMessageOrdered(prev: UIMessage[], content: string): UIMessage[] {
  const now = Date.now();
  const entry: UIMessage = { role: 'user', content, source: 'voice', arrivedAt: now };
  if (prev.length >= 2) {
    const last = prev[prev.length - 1];
    const age = now - (last.arrivedAt ?? 0);
    if (last.role === 'assistant' && age < REORDER_WINDOW_MS) {
      const next = [...prev];
      next.splice(prev.length - 1, 0, entry);
      return next;
    }
  }
  return [...prev, entry];
}

interface UsageSnapshot {
  tier: 'free' | 'plus' | 'pro';
  dateKey: string;
  capSeconds: number;
  usedSeconds: number;
  remainingSeconds: number;
}

function formatBudget(used: number, cap: number): string {
  const fmt = (s: number) => {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r === 0 ? `${m}m` : `${m}m${r}s`;
  };
  return `${fmt(used)} / ${fmt(cap)}`;
}

export function OrbVoicePanel({ audioLevelRef, voiceActiveRef }: OrbVoicePanelProps) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);

  const conversationRef = useRef<Conversation | null>(null);
  const rafRef = useRef<number | null>(null);
  const capTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep transcript auto-scrolled to latest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Tear down on unmount — close mic, cancel rAF, stop cap timer, zero
  // out the shared audio ref so the orb stops glowing.
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (capTimeoutRef.current) clearTimeout(capTimeoutRef.current);
      capTimeoutRef.current = null;
      audioLevelRef.current = 0;
      if (voiceActiveRef) voiceActiveRef.current = false;
      void conversationRef.current?.endSession();
      conversationRef.current = null;
    };
  }, [audioLevelRef, voiceActiveRef]);

  // Load today's voice budget on mount so the budget chip is accurate
  // before the user touches anything.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const res = await fetch('/api/orb/voice-usage', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const snap = (await res.json()) as UsageSnapshot;
        if (!cancelled) setUsage(snap);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function startAmplitudeLoop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const tick = () => {
      const c = conversationRef.current;
      if (!c) {
        rafRef.current = null;
        audioLevelRef.current = 0;
        return;
      }
      const input = typeof c.getInputVolume === 'function' ? c.getInputVolume() ?? 0 : 0;
      const output = typeof c.getOutputVolume === 'function' ? c.getOutputVolume() ?? 0 : 0;
      // The SDK's volume getters return RMS values that peak around
      // 0.2–0.3 for typical speech. Multiply by 4 and clamp at 1 so
      // normal talking actually drives the visual to its full range
      // instead of a barely-perceptible ~5% lift. Output gets priority
      // (it's the more dramatic "orb speaking" moment), but mic input
      // drives the visual when the user is talking — feels reciprocal.
      const raw = Math.max(input, output);
      const boosted = Math.min(1, raw * 4);
      // Light smoothing so the visual doesn't strobe between frames.
      // 0.5 mix keeps responsiveness while killing single-frame spikes.
      audioLevelRef.current = audioLevelRef.current * 0.5 + boosted * 0.5;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  async function recordElapsed(seconds: number) {
    if (seconds <= 0) return;
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch('/api/orb/voice-usage', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ seconds }),
      });
      if (res.ok) {
        const snap = (await res.json()) as UsageSnapshot;
        setUsage(snap);
      }
    } catch {
      /* non-fatal */
    }
  }

  async function startVoice() {
    const user = auth.currentUser;
    if (!user || conversationRef.current) return;
    setVoiceError(null);
    setVoiceState('connecting');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/orb/voice-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 429) {
        const body = (await res.json()) as { tier: UsageSnapshot['tier']; capSeconds: number };
        const mins = Math.round(body.capSeconds / 60);
        const unit = body.capSeconds < 60 ? `${body.capSeconds}s` : `${mins}m`;
        setVoiceError(`Out of voice for today — ${unit} on the ${body.tier} tier. Back tomorrow.`);
        setVoiceState('error');
        return;
      }
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`session: ${res.status} ${detail}`);
      }
      const { signedUrl, systemPrompt, firstMessage, remainingSeconds } = (await res.json()) as {
        signedUrl: string;
        systemPrompt: string;
        firstMessage: string;
        remainingSeconds: number;
      };

      if (capTimeoutRef.current) clearTimeout(capTimeoutRef.current);
      capTimeoutRef.current = setTimeout(
        () => {
          void stopVoice();
          setVoiceError('Daily voice cap reached. See you tomorrow.');
        },
        Math.max(1000, remainingSeconds * 1000 + 500),
      );

      sessionStartRef.current = Date.now();

      const conv = await Conversation.startSession({
        signedUrl,
        overrides: {
          agent: {
            prompt: { prompt: systemPrompt },
            firstMessage,
          },
        },
        clientTools: {
          // Orb calls this when an answer would be too long to speak —
          // detailed text lands in the transcript while the spoken
          // reply stays one short sentence. Massive TTS-cost win.
          send_long_form: ({ text }: { text: string }) => {
            const detail = typeof text === 'string' ? text.trim() : '';
            if (!detail) return 'empty';
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: detail,
                source: 'voice-long-form',
                arrivedAt: Date.now(),
              },
            ]);
            return 'delivered';
          },
        },
        onConnect: () => {
          setVoiceState('listening');
          if (voiceActiveRef) voiceActiveRef.current = true;
          startAmplitudeLoop();
        },
        onDisconnect: (details) => {
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
          if (capTimeoutRef.current) clearTimeout(capTimeoutRef.current);
          capTimeoutRef.current = null;
          audioLevelRef.current = 0;
          if (voiceActiveRef) voiceActiveRef.current = false;
          conversationRef.current = null;

          const start = sessionStartRef.current;
          sessionStartRef.current = null;
          if (start) {
            const elapsed = Math.round((Date.now() - start) / 1000);
            void recordElapsed(elapsed);
          }

          if (details && typeof details === 'object') {
            const reason =
              'reason' in details && typeof details.reason === 'string'
                ? details.reason
                : 'unknown';
            if (reason !== 'user') {
              setVoiceError(`disconnected: ${reason}`);
              setVoiceState('error');
              return;
            }
          }
          setVoiceState('idle');
        },
        onError: (msg) => {
          setVoiceError(typeof msg === 'string' ? msg : 'voice error');
          setVoiceState('error');
        },
        onModeChange: ({ mode }) => {
          setVoiceState(mode === 'speaking' ? 'speaking' : 'listening');
        },
        onMessage: ({ message, source }) => {
          if (!message) return;
          if (source === 'user') {
            setMessages((prev) => insertUserMessageOrdered(prev, message));
          } else {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: message,
                source: 'voice',
                arrivedAt: Date.now(),
              },
            ]);
          }
        },
      });
      conversationRef.current = conv;
    } catch (e) {
      setVoiceError(e instanceof Error ? e.message : 'unknown');
      setVoiceState('error');
      conversationRef.current = null;
      audioLevelRef.current = 0;
      if (voiceActiveRef) voiceActiveRef.current = false;
    }
  }

  async function stopVoice() {
    const conv = conversationRef.current;
    if (!conv) {
      setVoiceState('idle');
      return;
    }
    try {
      await conv.endSession();
    } finally {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (capTimeoutRef.current) clearTimeout(capTimeoutRef.current);
      capTimeoutRef.current = null;
      audioLevelRef.current = 0;
      if (voiceActiveRef) voiceActiveRef.current = false;
      conversationRef.current = null;
      setVoiceState('idle');
    }
  }

  async function sendText() {
    const text = input.trim();
    if (!text || sending) return;
    const user = auth.currentUser;
    if (!user) return;

    setInput('');
    setSending(true);

    const history = messages
      .filter((m) => !m.pending)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text, source: 'text' },
      { role: 'assistant', content: '', source: 'text', pending: true },
    ]);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/orb/text', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text, history }),
      });

      if (!res.ok || !res.body) {
        const detail = await res.text();
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: 'assistant',
            content: `[error] ${detail || res.status}`,
            source: 'text',
          };
          return next;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assembled = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as
              | { type: 'delta'; text: string }
              | { type: 'done' }
              | { type: 'error'; message: string };
            if (event.type === 'delta') {
              assembled += event.text;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  role: 'assistant',
                  content: assembled,
                  source: 'text',
                  pending: true,
                };
                return next;
              });
            } else if (event.type === 'error') {
              assembled = `[error] ${event.message}`;
            }
          } catch {
            /* malformed line — skip */
          }
        }
      }

      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'assistant',
          content: assembled || '[no reply]',
          source: 'text',
        };
        return next;
      });
    } catch (e) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'assistant',
          content: `[error] ${e instanceof Error ? e.message : 'unknown'}`,
          source: 'text',
        };
        return next;
      });
    } finally {
      setSending(false);
    }
  }

  const voiceActive = voiceState !== 'idle' && voiceState !== 'error';
  const voiceLabel: Record<VoiceState, string> = {
    idle: 'TALK',
    connecting: 'CONNECTING…',
    listening: 'TAP TO STOP',
    speaking: 'TAP TO STOP',
    error: 'TRY AGAIN',
  };

  return (
    <div style={{ marginTop: 16, textAlign: 'left' }}>
      {/* Talk button + status + budget chip — sits centered below the
          orb's primary action row. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: 'space-between',
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => (voiceActive ? void stopVoice() : void startVoice())}
          disabled={voiceState === 'connecting'}
          className="font-body"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            background: voiceActive ? 'var(--b-accent)' : 'transparent',
            color: voiceActive ? 'var(--b-paper)' : 'var(--b-ink)',
            border: `1px solid ${voiceActive ? 'var(--b-accent)' : 'var(--b-ink)'}`,
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: '0.14em',
            cursor: voiceState === 'connecting' ? 'wait' : 'pointer',
            fontFamily: 'var(--font-inter)',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background:
                voiceState === 'speaking' || voiceState === 'listening'
                  ? 'var(--b-paper)'
                  : voiceState === 'connecting'
                    ? 'var(--b-accent)'
                    : 'transparent',
              border:
                voiceState === 'idle' || voiceState === 'error'
                  ? '1px solid var(--b-ink-60)'
                  : 'none',
            }}
          />
          {voiceLabel[voiceState]}
        </button>

        {voiceActive && (
          <span
            className="spread"
            style={{
              fontSize: 9,
              letterSpacing: '0.22em',
              color: voiceState === 'speaking' ? 'var(--b-accent)' : 'var(--b-ink)',
              fontWeight: 700,
            }}
          >
            {voiceState === 'speaking' ? 'ORB SPEAKING' : 'LISTENING'}
          </span>
        )}

        {usage && (
          <span
            className="font-body"
            style={{
              fontSize: 11,
              color:
                usage.remainingSeconds <= 0
                  ? 'var(--b-accent)'
                  : usage.remainingSeconds < 15
                    ? 'var(--b-ink)'
                    : 'var(--b-ink-60)',
              marginLeft: 'auto',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatBudget(usage.usedSeconds, usage.capSeconds)} · {usage.tier}
          </span>
        )}
      </div>

      {voiceError && (
        <p
          className="font-body"
          style={{
            fontSize: 11,
            color: 'var(--b-accent)',
            fontStyle: 'italic',
            margin: '0 0 12px',
          }}
        >
          {voiceError}
        </p>
      )}

      {/* Transcript — only renders when there's content, otherwise the
          panel collapses cleanly. Keeps the orb page tidy when the
          user hasn't started chatting yet. */}
      {messages.length > 0 && (
        <div
          ref={scrollRef}
          style={{
            border: '1px solid var(--b-rule)',
            padding: 14,
            maxHeight: 280,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            marginBottom: 10,
          }}
        >
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                className="spread"
                style={{
                  fontSize: 9,
                  color: m.role === 'user' ? 'var(--b-ink-40)' : 'var(--b-accent)',
                  marginBottom: 4,
                  letterSpacing: '0.22em',
                }}
              >
                {m.role === 'user' ? 'YOU' : 'ORB'}
                {m.source === 'voice' && (
                  <span style={{ color: 'var(--b-ink-40)', fontSize: 8, marginLeft: 6 }}>
                    · VOICE
                  </span>
                )}
                {m.source === 'voice-long-form' && (
                  <span style={{ color: 'var(--b-accent)', fontSize: 8, marginLeft: 6 }}>
                    · TEXT DETAIL
                  </span>
                )}
              </span>
              <p
                className="font-body"
                style={{
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: 'var(--b-ink)',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  opacity: m.pending && !m.content ? 0.4 : 1,
                  borderLeft: m.source === 'voice-long-form' ? '2px solid var(--b-accent)' : 'none',
                  paddingLeft: m.source === 'voice-long-form' ? 10 : 0,
                }}
              >
                {m.content || '…'}
              </p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void sendText();
            }
          }}
          disabled={sending}
          placeholder="Or type to the orb…"
          className="font-body"
          style={{
            flex: 1,
            padding: '9px 12px',
            background: 'transparent',
            border: '1px solid var(--b-rule)',
            color: 'var(--b-ink)',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <button
          onClick={() => void sendText()}
          disabled={sending || !input.trim()}
          className="font-body"
          style={{
            padding: '9px 14px',
            background: sending || !input.trim() ? 'transparent' : 'var(--b-ink)',
            color: sending || !input.trim() ? 'var(--b-ink-40)' : 'var(--b-paper)',
            border: '1px solid var(--b-ink)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-inter)',
          }}
        >
          {sending ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
