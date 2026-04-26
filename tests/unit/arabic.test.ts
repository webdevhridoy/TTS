import { describe, it, expect } from 'vitest';
import { normalizeArabicText, generateTextHash } from '@/lib/utils/arabic';

describe('Arabic Normalization Utilities', () => {
  it('should normalize basic Arabic text safely', () => {
    const raw = "هذا   نص  تجريبي";
    const result = normalizeArabicText(raw);
    expect(result).toBe("هذا نص تجريبي");
  });

  it('should generate identical hashes for identical payloads', async () => {
    const text = "تجربة";
    const voice = "ali";
    const hash1 = await generateTextHash(text, voice);
    const hash2 = await generateTextHash(text, voice);
    expect(hash1).toEqual(hash2);
    expect(hash1.length).toBeGreaterThan(10);
  });

  it('should generate different hashes for different voices or models', async () => {
    const text = "تجربة";
    const hashNormal = await generateTextHash(text, "ali", "elevenlabs", "multilingual");
    const hashAlternate = await generateTextHash(text, "omar", "elevenlabs", "multilingual");
    const hashModel = await generateTextHash(text, "ali", "elevenlabs", "different_model");
    
    expect(hashNormal).not.toEqual(hashAlternate);
    expect(hashNormal).not.toEqual(hashModel);
  });
});
