import { generateElevenLabsAudio } from "./elevenlabs";

type TTSProvider = "elevenlabs" | "openai";

export async function generateAudioBuffer(text: string, voiceId: string, provider: TTSProvider = "elevenlabs"): Promise<Buffer> {
  // In the future, pattern match on provider to route to other SDKs (e.g. OpenAI)
  if (provider === "elevenlabs") {
    return generateElevenLabsAudio(text, voiceId);
  }
  
  throw new Error(`TTS Provider ${provider} not implemented.`);
}
