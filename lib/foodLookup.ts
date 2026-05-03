/**
 * Free non-AI food lookup helpers — USDA FoodData Central for search,
 * Open Food Facts for barcode scans. Both are free; USDA requires a
 * (free) API key, Open Food Facts requires nothing.
 *
 * Setup:
 *   1. Sign up at https://fdc.nal.usda.gov/api-key-signup.html
 *   2. Add NEXT_PUBLIC_USDA_API_KEY=<key> to your env
 *   3. Without a key, search() returns []; barcode lookup still works
 */

import type { FoodItem } from '@/types/diet';

// ─── USDA FoodData Central ───────────────────────────────────────────

interface USDARawFood {
  fdcId:           number;
  description:     string;
  brandName?:      string;
  brandOwner?:     string;
  servingSize?:    number;
  servingSizeUnit?: string;
  foodNutrients?:  Array<{ nutrientName: string; nutrientNumber: string; value: number; unitName: string }>;
}

interface USDASearchResponse {
  foods: USDARawFood[];
}

export interface USDASearchResult {
  fdcId:        number;
  name:         string;
  brand?:       string;
  servingSize?: number;
  servingUnit?: string;
  kcalPerServing:    number;
  proteinPerServing: number;
  carbsPerServing:   number;
  fatPerServing:     number;
}

/** Pull the first matching nutrient from USDA's flat foodNutrients array. */
function pickNutrient(food: USDARawFood, nutrientNumber: string): number {
  const n = food.foodNutrients?.find((x) => x.nutrientNumber === nutrientNumber);
  return n?.value ?? 0;
}

/** Search USDA's database. Empty array if no API key configured. */
export async function searchUSDA(query: string, max = 10): Promise<USDASearchResult[]> {
  const key = process.env.NEXT_PUBLIC_USDA_API_KEY;
  if (!key) return [];
  if (!query.trim()) return [];

  const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
  url.searchParams.set('query', query);
  url.searchParams.set('pageSize', String(max));
  url.searchParams.set('dataType', 'Foundation,SR Legacy,Branded'); // skip Survey (less reliable)
  url.searchParams.set('api_key', key);

  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = (await res.json()) as USDASearchResponse;

  return (data.foods ?? []).map((f) => ({
    fdcId:        f.fdcId,
    name:         f.description,
    brand:        f.brandName ?? f.brandOwner,
    servingSize:  f.servingSize,
    servingUnit:  f.servingSizeUnit,
    // USDA nutrient numbers: 208 = energy kcal, 203 = protein, 205 = carbs, 204 = fat
    // Values are per 100g for unbranded; per serving for some branded items.
    kcalPerServing:    pickNutrient(f, '208'),
    proteinPerServing: pickNutrient(f, '203'),
    carbsPerServing:   pickNutrient(f, '205'),
    fatPerServing:     pickNutrient(f, '204'),
  }));
}

/** Convert a USDA search result + chosen serving count into a FoodItem. */
export function usdaToFoodItem(result: USDASearchResult, servings = 1): FoodItem {
  const unit = result.servingSize && result.servingUnit
    ? `${result.servingSize}${result.servingUnit}`
    : 'serving';
  return {
    name:    result.name,
    qty:     servings,
    unit,
    kcal:    Math.round(result.kcalPerServing    * servings),
    protein: Math.round(result.proteinPerServing * servings * 2) / 2,
    carbs:   Math.round(result.carbsPerServing   * servings * 2) / 2,
    fat:     Math.round(result.fatPerServing     * servings * 2) / 2,
  };
}

// ─── Open Food Facts (barcode) ───────────────────────────────────────

interface OFFRawProduct {
  status: number;
  product?: {
    product_name?:  string;
    brands?:        string;
    serving_size?:  string;
    nutriments?: {
      'energy-kcal_100g'?:    number;
      'energy-kcal_serving'?: number;
      proteins_100g?:         number;
      proteins_serving?:      number;
      carbohydrates_100g?:    number;
      carbohydrates_serving?: number;
      fat_100g?:              number;
      fat_serving?:           number;
    };
  };
}

/** Look up a packaged food by its barcode. Returns null if not found. */
export async function lookupBarcode(code: string): Promise<FoodItem | null> {
  const cleaned = code.replace(/\D/g, '');
  if (!cleaned) return null;

  const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${cleaned}.json`);
  if (!res.ok) return null;
  const data = (await res.json()) as OFFRawProduct;
  if (data.status !== 1 || !data.product) return null;

  const p = data.product;
  const n = p.nutriments ?? {};

  // Prefer per-serving values if available, else per-100g (treat 100g as
  // the serving). This is the same fallback Open Food Facts UI uses.
  const useServing = typeof n['energy-kcal_serving'] === 'number';
  const kcal    = useServing ? n['energy-kcal_serving']!   : (n['energy-kcal_100g']    ?? 0);
  const protein = useServing ? n.proteins_serving!         : (n.proteins_100g          ?? 0);
  const carbs   = useServing ? n.carbohydrates_serving!    : (n.carbohydrates_100g     ?? 0);
  const fat     = useServing ? n.fat_serving!              : (n.fat_100g               ?? 0);

  return {
    name:    p.product_name || `Barcode ${cleaned}`,
    qty:     1,
    unit:    useServing ? (p.serving_size || 'serving') : '100g',
    kcal:    Math.round(kcal),
    protein: Math.round(protein * 2) / 2,
    carbs:   Math.round(carbs   * 2) / 2,
    fat:     Math.round(fat     * 2) / 2,
  };
}
