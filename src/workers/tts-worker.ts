// Run this file in a background Node process (e.g. `npx tsx src/workers/tts-worker.ts`)
import { Worker, Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { generateAudioBuffer } from "../lib/tts/index";
import { createClient } from "@supabase/supabase-js";

// Make sure to load environment variables locally via dotenv if running outside Next.js lifecycle.
const prisma = new PrismaClient();

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// We define an isolated standard connection configuration for BullMQ worker
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const connection = new URL(redisUrl);

console.log("-> Starting TTS BullMQ Worker on Queue 'tts-generation'...");

const worker = new Worker('tts-generation', async (job: Job) => {
  const { generationId, userId, normalizedText, voiceId, provider, charactersCount } = job.data;
  const startTime = Date.now();

  try {
    // 1. Mark as processing idempotently
    const initialCheck = await prisma.audioGeneration.findUnique({ where: { id: generationId }});
    if (initialCheck?.status === "completed" || initialCheck?.status === "failed") {
      throw new Error("Job already processed: Idempotent skip");
    }

    await prisma.audioGeneration.update({
      where: { id: generationId },
      data: { status: "processing" }
    });

    console.log(`[Job ${job.id}] Generating ${charactersCount} chars for User: ${userId}`);

    // 2. Worker calls ElevenLabs (or chosen provider)
    const audioBuffer = await generateAudioBuffer(normalizedText, voiceId, provider);
    const fileSizeBytes = audioBuffer.byteLength;
    const durationSeconds = charactersCount / 12; // Crude approximation, real SDK might provide it or calculate via mp3 header
    
    // 3. Upload to Supabase Storage
    const fileName = `audio/${userId}/${generationId}.mp3`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(process.env.SUPABASE_STORAGE_BUCKET || "audio-files")
      .upload(fileName, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true
      });

    if (uploadError) throw new Error(`Supabase upload failed: ${uploadError.message}`);

    const generationTimeMs = Date.now() - startTime;

    // 4 & 5. Prisma Transaction to definitively complete state and charge usage simultaneously!
    await prisma.$transaction(async (tx) => {
      // Re-verify it isn't completely already
      const currentGen = await tx.audioGeneration.findUnique({ where: { id: generationId }});
      if (currentGen?.status === "completed") {
        throw new Error("Job already completed, preventing double usage charge.");
      }

      await tx.audioGeneration.update({
        where: { id: generationId },
        data: {
          status: "completed",
          audioUrl: fileName, // STRORING SAFE PATH INSTEAD OF EXPIRED URL
          durationSeconds,
          generationTimeMs,
          mimeType: "audio/mpeg",
          fileSizeBytes
        }
      });

      await tx.usageRecord.create({
        data: {
          userId,
          charactersUsed: charactersCount,
          provider
        }
      });
    });

    console.log(`[Job ${job.id}] Success! Audio generation & upload complete.`);
    return { success: true, audioPath: fileName };

  } catch (error: any) {
    console.error(`[Job ${job.id}] Failed:`, error.message);
    const generationTimeMs = Date.now() - startTime;

    // Fail gracefully: save error message, update status to failed.
    await prisma.audioGeneration.update({
      where: { id: generationId },
      data: { 
        status: "failed", 
        errorMessage: error.message,
        generationTimeMs
      }
    });

    // We DO NOT write to UsageRecord so the user is not charged.
    throw error;
  }
}, { 
   connection: {
     host: connection.hostname,
     port: parseInt(connection.port) || 6379,
     username: connection.username,
     password: connection.password,
   } 
});

worker.on('failed', (job, err) => {
  console.log(`Worker job ${job?.id} failed with error ${err.message}`);
});
