'use client';

import { useEffect, useRef, useState } from 'react';
import { Conversation } from '@elevenlabs/client';
import { auth } from '@/lib/firebase';

/**
 * Dev page for the orb's text + voice modes. Same Firestore context +
 * persona feed both. The actual orb command-center UI will look very
 * different — this page exists only so we can iterate on tone before
 * wiring it into /orb proper.
 */

interface UIMessage {
  role: 'user' | 'assistant';
  content: string;
  source?: 'text' | 'voice' | 'voice-long-form';
  pending?: boolean;
  usage?: { input: number; output: number; cacheRead: number; cacheCreated: number };
}

type VoiceState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

function formatVoiceBudget(used: number, cap: number): string {
  // Compact form: under a minute → seconds, otherwise mm:ss-style.
  function fmt(s: number): string {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r === 0 ? `${m}m` : `${m}m${r}s`;
  }
  return `${fmt(used)} / ${fmt(cap)} today`;
}

export default function OrbDebugPage() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [contextPreview, setContextPreview] = useState<string>('Loading context…');
  const [showContext, setShowContext] = useState(false);

  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const conversationRef = useRef<Conversation | null>(null);
  const rafRef = useRef<number | null>(null);

  // Voice usage tracking — daily cap enforcement.
  interface UsageSnapshot {
    tier: 'free' | 'plus' | 'pro';
    dateKey: string;
    capSeconds: number;
    usedSeconds: number;
    remainingSeconds: number;
  }
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  const capTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Pull the snapshot once on mount so we can show what the orb sees.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          if (!cancelled) setContextPreview('Not signed in.');
          return;
        }
        const token = await user.getIdToken();
        const res = await fetch('/api/orb/debug-context', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.text();
        if (!cancelled) setContextPreview(body);
      } catch (e) {
        if (!cancelled)
          setContextPreview(`Error: ${e instanceof Error ? e.message : 'unknown'}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Clean up the voice session if the user leaves the page mid-call.
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (capTimeoutRef.current) clearTimeout(capTimeoutRef.current);
      capTimeoutRef.current = null;
      void conversationRef.current?.endSession();
      conversationRef.current = null;
    };
  }, []);

  // Show current daily usage on mount so the user knows their budget
  // before they start. Refreshed every time a session ends.
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
        // non-fatal — usage display just stays blank
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Post elapsed seconds to the server so today's bucket increments.
  async function recordElapsed(seconds: number) {
    if (seconds <= 0) return;
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch('/api/orb/voice-usage', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ seconds }),
      });
      if (res.ok) {
        const snap = (await res.json()) as UsageSnapshot;
        setUsage(snap);
      }
    } catch {
      // non-fatal — server already has the increment if it landed
    }
  }

  // Drive the amplitude-reactive circle. Polls whichever side is
  // currently producing sound — mic input or TTS output — and surfaces
  // the higher of the two so the visual reads as "audio is flowing"
  // regardless of direction.
  function startAmplitudeLoop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const tick = () => {
      const c = conversationRef.current;
      if (!c) {
        rafRef.current = null;
        setAudioLevel(0);
        return;
      }
      const input =
        typeof c.getInputVolume === 'function' ? c.getInputVolume() ?? 0 : 0;
      const output =
        typeof c.getOutputVolume === 'function' ? c.getOutputVolume() ?? 0 : 0;
      setAudioLevel(Math.max(input, output));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  async function send() {
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
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
      let usage: UIMessage['usage'];

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
              | { type: 'done'; usage: NonNullable<UIMessage['usage']> }
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
            } else if (event.type === 'done') {
              usage = event.usage;
            } else if (event.type === 'error') {
              assembled = `[error] ${event.message}`;
            }
          } catch {
            // ignore malformed lines
          }
        }
      }

      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'assistant',
          content: assembled || '[no reply]',
          source: 'text',
          usage,
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

  async function startVoice() {
    const user = auth.currentUser;
    if (!user) return;
    if (conversationRef.current) return;

    setVoiceError(null);
    setVoiceState('connecting');

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/orb/voice-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 429) {
        const body = (await res.json()) as {
          tier: 'free' | 'plus' | 'pro';
          capSeconds: number;
          usedSeconds: number;
        };
        const mins = Math.round(body.capSeconds / 60);
        setVoiceError(
          `Out of voice for today — you've used your ${mins} min on the ${body.tier} tier. Comes back tomorrow.`,
        );
        setVoiceState('error');
        return;
      }
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`session: ${res.status} ${detail}`);
      }
      const { signedUrl, systemPrompt, firstMessage, remainingSeconds } =
        (await res.json()) as {
          signedUrl: string;
          systemPrompt: string;
          firstMessage: string;
          remainingSeconds: number;
          capSeconds: number;
          tier: 'free' | 'plus' | 'pro';
        };

      // Arm an auto-end timer so the session can't run past the user's
      // remaining quota — saves us from being billed for time we can't
      // recoup. Padded by 500ms to let the SDK finish its current frame.
      if (capTimeoutRef.current) clearTimeout(capTimeoutRef.current);
      capTimeoutRef.current = setTimeout(
        () => {
          void stopVoice();
          setVoiceError("Daily voice cap reached. See you tomorrow.");
        },
        Math.max(1000, remainingSeconds * 1000 + 500),
      );

      sessionStartRef.current = Date.now();

      // Mic permission prompt happens here; the SDK throws if denied.
      // Only system_prompt + first_message overrides are enabled in the
      // ElevenLabs agent config; sending any other field would close
      // the connection with 'Override for field X is not allowed'.
      const conv = await Conversation.startSession({
        signedUrl,
        overrides: {
          agent: {
            prompt: { prompt: systemPrompt },
            firstMessage,
          },
        },
        clientTools: {
          // The orb calls this when an answer is too long for voice.
          // Text lands directly in the chat panel; the orb speaks only
          // a one-sentence summary instead of reading the full thing.
          send_long_form: ({ text }: { text: string }) => {
            const detail = typeof text === 'string' ? text.trim() : '';
            if (!detail) return 'empty';
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: detail,
                source: 'voice-long-form',
              },
            ]);
            return 'delivered';
          },
        },
        onConnect: () => {
          console.log('[orb] connected');
          setVoiceState('listening');
          startAmplitudeLoop();
        },
        onDisconnect: (details) => {
          console.log('[orb] disconnect', details);
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
          if (capTimeoutRef.current) clearTimeout(capTimeoutRef.current);
          capTimeoutRef.current = null;
          setAudioLevel(0);
          conversationRef.current = null;

          // Bill the elapsed time to today's bucket. Wall clock is the
          // best available proxy — the SDK doesn't expose TTS character
          // count cleanly, and we'd rather slightly over-credit users
          // than undercount and lose money.
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
            const ctx =
              'context' in details && details.context !== undefined
                ? JSON.stringify(details.context).slice(0, 200)
                : '';
            if (reason !== 'user') {
              setVoiceError(`disconnected: ${reason}${ctx ? ' — ' + ctx : ''}`);
              setVoiceState('error');
              return;
            }
          }
          setVoiceState('idle');
        },
        onError: (msg, context) => {
          console.error('[orb] error', msg, context);
          const detail = typeof msg === 'string' ? msg : 'voice error';
          const ctxStr = context ? ` — ${JSON.stringify(context).slice(0, 200)}` : '';
          setVoiceError(`${detail}${ctxStr}`);
          setVoiceState('error');
        },
        onModeChange: ({ mode }) => {
          setVoiceState(mode === 'speaking' ? 'speaking' : 'listening');
        },
        onMessage: ({ message, source }) => {
          if (!message) return;
          setMessages((prev) => [
            ...prev,
            {
              role: source === 'user' ? 'user' : 'assistant',
              content: message,
              source: 'voice',
            },
          ]);
        },
      });
      conversationRef.current = conv;
    } catch (e) {
      setVoiceError(e instanceof Error ? e.message : 'unknown');
      setVoiceState('error');
      conversationRef.current = null;
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
      setAudioLevel(0);
      conversationRef.current = null;
      setVoiceState('idle');
    }
  }

  const voiceLabel: Record<VoiceState, string> = {
    idle: 'Talk',
    connecting: 'Connecting…',
    listening: 'Listening — tap to stop',
    speaking: 'Orb speaking — tap to stop',
    error: 'Try again',
  };
  const voiceActive = voiceState !== 'idle' && voiceState !== 'error';

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
      <h1
        className="font-display"
        style={{
          fontSize: 28,
          fontStyle: 'italic',
          fontWeight: 500,
          color: 'var(--b-ink)',
          margin: '0 0 8px',
        }}
      >
        Orb chat — dev
      </h1>
      <p
        className="font-body"
        style={{ fontSize: 12, color: 'var(--b-ink-60)', marginBottom: 16 }}
      >
        Text mode iterates on tone. Voice mode runs the same persona + context through ElevenLabs.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <button
          onClick={() => (voiceActive ? void stopVoice() : void startVoice())}
          disabled={voiceState === 'connecting'}
          className="font-body"
          style={{
            padding: '10px 18px',
            background: voiceActive ? 'var(--b-accent)' : 'transparent',
            color: voiceActive ? 'var(--b-paper)' : 'var(--b-ink)',
            border: `1px solid ${voiceActive ? 'var(--b-accent)' : 'var(--b-ink)'}`,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            cursor: voiceState === 'connecting' ? 'wait' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background:
                voiceState === 'speaking'
                  ? 'var(--b-paper)'
                  : voiceState === 'listening'
                    ? 'var(--b-paper)'
                    : voiceState === 'connecting'
                      ? 'var(--b-accent)'
                      : 'transparent',
              border:
                voiceState === 'idle' || voiceState === 'error'
                  ? '1px solid var(--b-ink-60)'
                  : 'none',
              animation:
                voiceState === 'connecting' || voiceState === 'speaking'
                  ? 'pulse 1.2s ease-in-out infinite'
                  : 'none',
            }}
          />
          {voiceLabel[voiceState]}
        </button>

        <button
          onClick={() => setShowContext((v) => !v)}
          className="font-body"
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--b-ink-60)',
            background: 'transparent',
            border: '1px solid var(--b-rule)',
            padding: '6px 10px',
            cursor: 'pointer',
          }}
        >
          {showContext ? 'Hide context' : 'Show context'}
        </button>

        {voiceError && (
          <span
            className="font-body"
            style={{ fontSize: 11, color: 'var(--b-accent)', fontStyle: 'italic' }}
          >
            {voiceError}
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
                  : usage.remainingSeconds < 30
                    ? 'var(--b-ink)'
                    : 'var(--b-ink-60)',
              marginLeft: 'auto',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatVoiceBudget(usage.usedSeconds, usage.capSeconds)} · {usage.tier}
          </span>
        )}
      </div>

      {showContext && (
        <pre
          style={{
            background: 'var(--b-ink-05)',
            border: '1px solid var(--b-rule)',
            padding: 14,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 11,
            lineHeight: 1.55,
            color: 'var(--b-ink)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            marginBottom: 24,
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {contextPreview}
        </pre>
      )}

      {voiceActive && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px 0 24px',
            marginBottom: 12,
            border: '1px solid var(--b-rule)',
            background: 'var(--b-ink-05)',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 120,
              height: 120,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Outer ring — pulses by audio amplitude */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: `2px solid ${
                  voiceState === 'speaking'
                    ? 'var(--b-accent)'
                    : voiceState === 'listening'
                      ? 'var(--b-ink)'
                      : 'var(--b-ink-40)'
                }`,
                transform: `scale(${1 + audioLevel * 0.6})`,
                opacity: voiceState === 'connecting' ? 0.4 : 0.9,
                transition: 'transform 60ms linear, border-color 200ms ease',
              }}
            />
            {/* Inner filled disc — opacity follows amplitude */}
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background:
                  voiceState === 'speaking' ? 'var(--b-accent)' : 'var(--b-ink)',
                opacity: 0.25 + audioLevel * 0.7,
                transform: `scale(${0.9 + audioLevel * 0.35})`,
                transition: 'transform 60ms linear, background 200ms ease',
              }}
            />
          </div>
          <span
            className="spread"
            style={{
              fontSize: 11,
              letterSpacing: '0.28em',
              color:
                voiceState === 'speaking'
                  ? 'var(--b-accent)'
                  : voiceState === 'listening'
                    ? 'var(--b-ink)'
                    : 'var(--b-ink-60)',
              marginTop: 16,
              fontWeight: 700,
            }}
          >
            {voiceState === 'connecting'
              ? 'CONNECTING…'
              : voiceState === 'speaking'
                ? 'ORB SPEAKING'
                : voiceState === 'listening'
                  ? 'LISTENING'
                  : ''}
          </span>
          <span
            className="font-body"
            style={{
              fontSize: 11,
              color: 'var(--b-ink-40)',
              marginTop: 6,
              fontStyle: 'italic',
            }}
          >
            {voiceState === 'listening'
              ? 'Say something — the orb is hearing you'
              : voiceState === 'speaking'
                ? 'Speak to interrupt'
                : ''}
          </span>
        </div>
      )}

      <div
        ref={scrollRef}
        style={{
          border: '1px solid var(--b-rule)',
          padding: 16,
          minHeight: 320,
          maxHeight: 480,
          overflowY: 'auto',
          marginBottom: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.length === 0 && (
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-40)', fontStyle: 'italic' }}
          >
            Say something to the orb — or hit Talk.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              className="spread"
              style={{
                fontSize: 9,
                color: m.role === 'user' ? 'var(--b-ink-40)' : 'var(--b-accent)',
                marginBottom: 4,
                display: 'inline-flex',
                gap: 6,
                alignItems: 'center',
              }}
            >
              {m.role === 'user' ? 'You' : 'Orb'}
              {m.source === 'voice' && (
                <span style={{ color: 'var(--b-ink-40)', fontSize: 8 }}>· voice</span>
              )}
              {m.source === 'voice-long-form' && (
                <span style={{ color: 'var(--b-accent)', fontSize: 8 }}>· text-only detail</span>
              )}
            </span>
            <p
              className="font-body"
              style={{
                fontSize: 14,
                lineHeight: 1.55,
                color: 'var(--b-ink)',
                margin: 0,
                whiteSpace: 'pre-wrap',
                opacity: m.pending && !m.content ? 0.4 : 1,
                // Long-form replies get a subtle left rule so the eye
                // catches "this was the detail, not the spoken bit."
                borderLeft:
                  m.source === 'voice-long-form'
                    ? '2px solid var(--b-accent)'
                    : 'none',
                paddingLeft: m.source === 'voice-long-form' ? 10 : 0,
              }}
            >
              {m.content || '…'}
            </p>
            {m.usage && (
              <span
                className="font-body"
                style={{
                  fontSize: 10,
                  color: 'var(--b-ink-40)',
                  marginTop: 4,
                  fontStyle: 'italic',
                }}
              >
                in {m.usage.input} (cached {m.usage.cacheRead}) · out {m.usage.output}
              </span>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          disabled={sending}
          placeholder="Type to the orb…"
          className="font-body"
          style={{
            flex: 1,
            padding: '10px 12px',
            background: 'transparent',
            border: '1px solid var(--b-rule)',
            color: 'var(--b-ink)',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          onClick={() => void send()}
          disabled={sending || !input.trim()}
          className="font-body"
          style={{
            padding: '10px 16px',
            background: sending || !input.trim() ? 'transparent' : 'var(--b-ink)',
            color: sending || !input.trim() ? 'var(--b-ink-40)' : 'var(--b-paper)',
            border: '1px solid var(--b-ink)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {sending ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
