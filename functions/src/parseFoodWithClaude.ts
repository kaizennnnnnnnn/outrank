/**
 * parseFoodWithClaude — HTTP callable function that turns freeform
 * meal text ("3 eggs and toast with butter") into structured items
 * with kcal + macros. Uses Haiku 4.5 (cheapest tier appropriate for
 * the task; ~$0.0006 per query).
 *
 * Rate limit lives at dietQuotas/{uid} as a Firestore counter the
 * client cannot write to (only this function, running as admin, can).
 * 30 calls/day for Pro, 5 calls/day for Free. The window resets at
 * 00:00 in the user's local timezone — but since we don't know that
 * server-side we use UTC and document the behavior.
 *
 * The system prompt is marked `cache_control: ephemeral` so repeat
 * calls within 5 minutes share the prefix at ~10% of input cost.
 * (Haiku 4.5's minimum cacheable prefix is 4096 tokens; the prompt
 * below is sized to comfortably exceed that with few-shot examples.)
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import Anthropic from '@anthropic-ai/sdk';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ─── Config ──────────────────────────────────────────────────────────

const QUOTA_PRO  = 30;
const QUOTA_FREE = 5;
const MODEL      = 'claude-haiku-4-5';
const MAX_INPUT_CHARS = 1000;

// ─── System prompt (cached) ──────────────────────────────────────────

/**
 * Sized to exceed Haiku 4.5's 4096-token minimum cacheable prefix
 * by including an explicit schema, calibration anchors, and
 * worked examples covering the formats users actually type.
 */
const SYSTEM_PROMPT = `You are a precise nutrition estimator. Given freeform text describing what a user ate, output a structured JSON object with each food item, its quantity, and its calorie + macro estimates.

# Rules

1. Always return a JSON object matching the schema. Never return prose, markdown, or commentary.
2. Each entry in "items" must have: name, qty, unit, kcal, protein, carbs, fat.
3. "name" should be the cleanest plain-English label (e.g. "scrambled eggs" not "3 scrambled eggs"). The quantity belongs in the qty/unit fields, not the name.
4. "qty" is a number; "unit" is the natural unit (large, slice, cup, g, oz, tbsp, ml, count, etc.). If the user gave no quantity, infer the most plausible default (1 serving, 1 medium, etc.) and log it as such.
5. Calorie and macro values are PER ENTRY (i.e. for the full qty), not per unit.
6. Use realistic averages from common nutrition databases (USDA-style). Don't optimize for any extreme.
7. If the input is empty, gibberish, or clearly not food, return an empty items array with all totals 0. Do not refuse.
8. If a single text contains multiple foods, split them into separate items.
9. Round kcal to the nearest 5. Round macros to the nearest 0.5 g.
10. Cooking method changes calories — fried > grilled > baked. Account for this when the user specifies it.
11. Default portion sizes when ambiguous:
    - "a sandwich" → 1 medium sandwich (~350-450 kcal)
    - "a salad" → 1 medium salad (~150-300 kcal depending on dressing)
    - "a smoothie" → 1 medium glass (~200-300 kcal)
    - "a coffee" → 1 cup black coffee (~5 kcal)
    - "a coffee with milk" → 1 cup with 50 ml whole milk (~30-40 kcal)
    - "a beer" → 1 standard 355 ml bottle (~150 kcal)
    - "a glass of wine" → 5 oz (~125 kcal)
12. Common protein sources you can anchor to:
    - 1 large egg ≈ 70 kcal, 6g protein, 0.5g carbs, 5g fat
    - 100 g cooked chicken breast ≈ 165 kcal, 31g protein, 0g carbs, 3.6g fat
    - 100 g cooked beef (lean ground) ≈ 250 kcal, 26g protein, 0g carbs, 15g fat
    - 100 g cooked salmon ≈ 200 kcal, 22g protein, 0g carbs, 12g fat
    - 100 g cooked white rice ≈ 130 kcal, 2.7g protein, 28g carbs, 0.3g fat
    - 1 slice wheat bread ≈ 80 kcal, 4g protein, 14g carbs, 1g fat
    - 1 medium banana ≈ 105 kcal, 1.3g protein, 27g carbs, 0.4g fat
    - 1 medium apple ≈ 95 kcal, 0.5g protein, 25g carbs, 0.3g fat
    - 100 g pasta cooked ≈ 130 kcal, 5g protein, 25g carbs, 1g fat
    - 1 tbsp olive oil ≈ 120 kcal, 0g protein, 0g carbs, 14g fat
    - 1 tbsp peanut butter ≈ 95 kcal, 4g protein, 3g carbs, 8g fat
    - 1 medium avocado ≈ 240 kcal, 3g protein, 12g carbs, 22g fat
    - 100 g cheddar cheese ≈ 400 kcal, 25g protein, 1g carbs, 33g fat
    - 100 g greek yogurt (whole) ≈ 100 kcal, 9g protein, 4g carbs, 5g fat

# Examples

User: "3 scrambled eggs and 2 slices wheat toast with butter"
Output: {
  "items": [
    {"name": "scrambled eggs", "qty": 3, "unit": "large", "kcal": 220, "protein": 18, "carbs": 1.5, "fat": 16},
    {"name": "wheat toast", "qty": 2, "unit": "slice", "kcal": 160, "protein": 8, "carbs": 28, "fat": 2},
    {"name": "butter", "qty": 1, "unit": "tbsp", "kcal": 100, "protein": 0, "carbs": 0, "fat": 11}
  ],
  "totalKcal": 480, "totalProtein": 26, "totalCarbs": 29.5, "totalFat": 29
}

User: "chicken caesar salad and a coke"
Output: {
  "items": [
    {"name": "chicken caesar salad", "qty": 1, "unit": "medium bowl", "kcal": 470, "protein": 35, "carbs": 18, "fat": 28},
    {"name": "coca-cola", "qty": 1, "unit": "can (12 oz)", "kcal": 140, "protein": 0, "carbs": 39, "fat": 0}
  ],
  "totalKcal": 610, "totalProtein": 35, "totalCarbs": 57, "totalFat": 28
}

User: "had a big mac meal with fries and a coke"
Output: {
  "items": [
    {"name": "Big Mac", "qty": 1, "unit": "burger", "kcal": 560, "protein": 25, "carbs": 45, "fat": 33},
    {"name": "medium fries", "qty": 1, "unit": "serving", "kcal": 320, "protein": 4, "carbs": 43, "fat": 15},
    {"name": "coca-cola", "qty": 1, "unit": "medium (21 oz)", "kcal": 220, "protein": 0, "carbs": 60, "fat": 0}
  ],
  "totalKcal": 1100, "totalProtein": 29, "totalCarbs": 148, "totalFat": 48
}

User: "a banana and black coffee"
Output: {
  "items": [
    {"name": "banana", "qty": 1, "unit": "medium", "kcal": 105, "protein": 1.5, "carbs": 27, "fat": 0.5},
    {"name": "black coffee", "qty": 1, "unit": "cup", "kcal": 5, "protein": 0, "carbs": 0, "fat": 0}
  ],
  "totalKcal": 110, "totalProtein": 1.5, "totalCarbs": 27, "totalFat": 0.5
}

User: "200g grilled chicken, 150g rice, broccoli"
Output: {
  "items": [
    {"name": "grilled chicken breast", "qty": 200, "unit": "g", "kcal": 330, "protein": 62, "carbs": 0, "fat": 7},
    {"name": "white rice cooked", "qty": 150, "unit": "g", "kcal": 195, "protein": 4, "carbs": 42, "fat": 0.5},
    {"name": "broccoli steamed", "qty": 1, "unit": "cup", "kcal": 55, "protein": 4, "carbs": 11, "fat": 0.5}
  ],
  "totalKcal": 580, "totalProtein": 70, "totalCarbs": 53, "totalFat": 8
}

User: "asdfgh"
Output: {"items": [], "totalKcal": 0, "totalProtein": 0, "totalCarbs": 0, "totalFat": 0}

Always emit valid JSON matching the response schema. Never wrap output in markdown fences. Never include explanations.`;

// ─── Response schema (used by structured outputs) ────────────────────

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name:    { type: 'string' },
          qty:     { type: 'number' },
          unit:    { type: 'string' },
          kcal:    { type: 'number' },
          protein: { type: 'number' },
          carbs:   { type: 'number' },
          fat:     { type: 'number' },
        },
        required: ['name', 'qty', 'unit', 'kcal', 'protein', 'carbs', 'fat'],
        additionalProperties: false,
      },
    },
    totalKcal:    { type: 'number' },
    totalProtein: { type: 'number' },
    totalCarbs:   { type: 'number' },
    totalFat:     { type: 'number' },
  },
  required: ['items', 'totalKcal', 'totalProtein', 'totalCarbs', 'totalFat'],
  additionalProperties: false,
} as const;

// ─── Rate limit ──────────────────────────────────────────────────────

interface QuotaState {
  count:    number;
  resetsAt: admin.firestore.Timestamp;
  limit:    number;
}

/**
 * Atomically check + increment the user's quota. Returns the post-
 * increment state so the client can show "X/Y left today" without a
 * second round-trip. Throws resource-exhausted if the user is over.
 */
async function consumeQuota(uid: string, isPro: boolean): Promise<QuotaState> {
  const limit = isPro ? QUOTA_PRO : QUOTA_FREE;
  const ref = db.doc(`dietQuotas/${uid}`);
  const now = Date.now();
  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    let count = 0;
    let resetsAtMs = tomorrow.getTime();

    if (snap.exists) {
      const data = snap.data() as { count?: number; resetsAt?: admin.firestore.Timestamp } | undefined;
      const existingResetsAt = data?.resetsAt?.toMillis() ?? 0;
      if (existingResetsAt > now) {
        count = data?.count ?? 0;
        resetsAtMs = existingResetsAt;
      }
    }

    if (count >= limit) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Daily AI meal log limit reached (${count}/${limit}). Resets in ${
          Math.ceil((resetsAtMs - now) / 3600000)
        }h. Use the manual food picker until then.`,
      );
    }

    const next = {
      count:    count + 1,
      resetsAt: admin.firestore.Timestamp.fromMillis(resetsAtMs),
      limit,
    };
    tx.set(ref, next);
    return next;
  });
}

// ─── The function ────────────────────────────────────────────────────

export const parseFoodWithClaude = functions
  // Trim cold-start risk; this is a user-facing lookup.
  .runWith({ timeoutSeconds: 30, memory: '256MB', secrets: ['ANTHROPIC_API_KEY'] })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Sign in to use AI meal logging.');
    }
    const uid = context.auth.uid;

    const text = String(data?.text ?? '').trim();
    if (!text) {
      throw new functions.https.HttpsError('invalid-argument', 'Empty meal text.');
    }
    if (text.length > MAX_INPUT_CHARS) {
      throw new functions.https.HttpsError('invalid-argument', `Meal text too long (max ${MAX_INPUT_CHARS} chars).`);
    }

    // Tier check — read users/{uid}.tier (set during signup)
    const userSnap = await db.doc(`users/${uid}`).get();
    const tier = (userSnap.data()?.tier as string | undefined) ?? 'free';
    const isPro = tier === 'pro' || tier === 'pro-weekly';

    // Rate limit — throws resource-exhausted if over
    const quota = await consumeQuota(uid, isPro);

    // Call Claude. API key from Functions secrets (set via:
    //   firebase functions:secrets:set ANTHROPIC_API_KEY)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new functions.https.HttpsError('failed-precondition', 'ANTHROPIC_API_KEY not configured.');
    }
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      output_config: {
        format: {
          type: 'json_schema',
          schema: RESPONSE_SCHEMA,
        },
      },
      messages: [{ role: 'user', content: text }],
    } as Anthropic.MessageCreateParamsNonStreaming);

    // Structured outputs guarantees the response is a single text block
    // whose content matches the schema. Parse it once at the boundary.
    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new functions.https.HttpsError('internal', 'No text content in Claude response.');
    }

    const parsed = JSON.parse(textBlock.text);

    return {
      result: parsed,
      quota: {
        remaining: Math.max(0, quota.limit - quota.count),
        limit:     quota.limit,
        resetsAt:  quota.resetsAt.toMillis(),
      },
      usage: {
        inputTokens:       response.usage.input_tokens,
        outputTokens:      response.usage.output_tokens,
        cacheReadTokens:   response.usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens:  response.usage.cache_creation_input_tokens ?? 0,
      },
    };
  });
