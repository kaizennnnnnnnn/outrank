/**
 * Client wrapper for the parseFoodWithClaude callable. Surfaces a
 * typed result + the post-call quota state so the UI can render
 * "X/Y AI logs left today" without an extra round-trip.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { ParseFoodResult, ParseFoodQuota } from '@/types/diet';

interface ParseFoodResponse {
  result: ParseFoodResult;
  quota:  ParseFoodQuota;
  usage?: {
    inputTokens:      number;
    outputTokens:     number;
    cacheReadTokens:  number;
    cacheWriteTokens: number;
  };
}

const fn = () =>
  httpsCallable<{ text: string }, ParseFoodResponse>(functions, 'parseFoodWithClaude');

export async function parseFoodAI(text: string): Promise<ParseFoodResponse> {
  const result = await fn()({ text });
  return result.data;
}
