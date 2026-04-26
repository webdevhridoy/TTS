import { ElevenLabsClient } from "elevenlabs";

// Initialize client only if key is available
export const getElevenLabsClient = () => {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }
  return new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
};

/**
 * Maps our internal voice IDs to actual ElevenLabs pre-made voice IDs.
 * 6 male + 4 female voices, all support eleven_multilingual_v2 (Arabic).
 */
export const VOICE_MAP: Record<string, string> = {
  // ── Male ──────────────────────────────────────────────────────
  "ali":     "pNInz6obpgDQGcFmaJgB", // Adam
  "omar":    "JBFqnCBsd6RMkjVDRZzb", // George
  "khalid":  "nPczCjzI2devNBz1zQrb", // Brian
  "ziad":    "onwK4e9ZLuTAKqWW03F9", // Daniel
  "hassan":  "SOYHLrjzK2X1ezoPC6cr", // Harry
  "tariq":   "pqHfZKP75CvOlQylNhV4", // Bill
  "youssef": "iP95p4xoKVk53GoZ742B", // Chris
  "faisal":  "N2lVS1w4EtoT3dr4eOWO", // Callum
  "mahmoud": "IKne3meq5aSn9XLyUdCD", // Charlie
  "saeed":   "TX3LPaxmHKxFdv7VOQHJ", // Liam
  "jawad":   "CwhRBWXzGAHq8TQ4Fs17", // Roger
  "hamza":   "bIHbv24MWmeRgasZH58o", // Will
  "ahmed":   "cjVigY5qzO86Huf0OWal", // Eric
  "osama":   "pNInz6obpgDQGcFmaJgB", // Adam (reuse)
  "nabil":   "pqHfZKP75CvOlQylNhV4", // Bill (reuse)
  // ── Female ────────────────────────────────────────────────────
  "maya":    "hpp4J3VqNfWAUOO0d1Us", // Bella
  "layla":   "EXAVITQu4vr4xnSDxMaL", // Sarah
  "nour":    "pFZP5JQG7iQjIQuC4Bku", // Lily
  "sara":    "Xb7hH8MSUJpSbSDYk0k2", // Alice
  "fatima":  "XrExE9yKIg1WjnnlVkGX", // Matilda
  "reem":    "cgSgspJ2msm6clMCkdW9", // Jessica
  "salma":   "FGY2WhTYpPnrIDTdsKH5", // Laura
  "hind":    "hpp4J3VqNfWAUOO0d1Us", // Bella (reuse)
  "zeina":   "EXAVITQu4vr4xnSDxMaL", // Sarah (reuse)
  "nadia":   "pFZP5JQG7iQjIQuC4Bku", // Lily (reuse)
  "zainab":  "Xb7hH8MSUJpSbSDYk0k2", // Alice (reuse)
  "asma":    "XrExE9yKIg1WjnnlVkGX", // Matilda (reuse)
  "lubna":   "cgSgspJ2msm6clMCkdW9", // Jessica (reuse)
};

export async function generateElevenLabsAudio(text: string, internalVoiceId: string) {
  const targetVoiceId = VOICE_MAP[internalVoiceId] || VOICE_MAP["ali"]; // Fallback to Ali

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY || "",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        output_format: "mp3_44100_128",
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      
      // Fallback for local testing so you aren't blocked by ElevenLabs API limits
      if (process.env.NODE_ENV === "development") {
        try {
          const errJson = JSON.parse(errText);
          const isBlocked = errJson.detail?.status === "detected_unusual_activity" || errJson.detail?.status === "quota_exceeded" || response.status === 401;
          
          if (isBlocked) {
            console.warn("⚠️ MOCKING ELEVENLABS AUDIO: Your ElevenLabs API key is blocked or out of quota. Returning mock audio buffer to progress testing.");
            
            // Standard silent MP3 base64 string to ensure the browser doesn't throw NotSupportedError
            const silentMp3Base64 = "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjQwLjEwMQAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIABIWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAAAAAAAAAAAAAAAAAAAAAAVkxBTUUzLjk5LjUAAgALAxAAAAAAAAAAI1ABVQgAMAAQAAABIADfF/7UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//tEwAAAAAANQAAAAgAAAA0gAAAEAAEMxAAAAAAANIAAAAAExBTUUzLjk5LjVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//tEwGQAAANIAAAAAExBTUUzLjk5LjVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
            
            return Buffer.from(silentMp3Base64, "base64");
          }
        } catch (e) {
          // JSON parse failed, proceed to normal throw
        }
      }

      throw new Error(`Status ${response.status}: ${errText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("ElevenLabs Generation failed:", error);
    throw error;
  }
}
