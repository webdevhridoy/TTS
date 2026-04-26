/**
 * Utilities for processing and normalizing Arabic text for TTS use.
 */

export function normalizeArabicText(text: string): string {
  if (!text) return "";

  let processed = text;

  // 1. Remove excessive whitespace
  processed = processed.replace(/\s+/g, " ");

  // 2. Normalize standard characters (e.g. unified Yeh and Alef)
  // Converting visual variants to standard Arabic letters
  processed = processed.replace(/ى/g, "ي"); // Alef Maksura -> Yeh (sometimes necessary for certain TTS engines)
  processed = processed.replace(/ئ/g, "ي"); // Yeh with Hamza -> Yeh (can be context-dependent)
  processed = processed.replace(/ؤ/g, "و"); // Waw with Hamza -> Waw

  // Normalize Alef format
  processed = processed.replace(/[أإآ]/g, "ا");

  // 3. Remove non-Arabic punctuation that could break TTS
  // Replaces english punctuation with arabic where relevant
  processed = processed.replace(/,/g, "،");
  processed = processed.replace(/\?/g, "؟");

  // Optional: Remove all diacritics if the TTS engine handles un-voweled text better
  // (ElevenLabs actually does well with Tashkeel, so we might want to keep it or offer it as a setting).
  // processed = processed.replace(/[\u064B-\u065F]/g, '');

  return processed.trim();
}

/**
 * Creates a unique hash for text to serve as a cache key.
 */
export async function generateTextHash(
  text: string, 
  voiceId: string, 
  provider: string = "elevenlabs", 
  modelId: string = "eleven_multilingual_v2"
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${text.trim()}-${voiceId}-${provider}-${modelId}`);
  
  // Create SHA-256 hash
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  
  return hashHex;
}
