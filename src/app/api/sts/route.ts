import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { auth } from "@clerk/nextjs/server";

// Audio-to-Audio (Speech-to-Speech) API Route
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const voiceId = formData.get("voiceId") as string || "ali";

    if (!audioFile) {
      return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
    }

    // Ensure mock user exists to prevent foreign key errors in local sqlite db
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: "local-tester@sawti.com",
        name: "Local Tester"
      }
    });

    const charactersCount = 500; // Flat charge for audio files in local mode

    // Map common names to ElevenLabs Voice IDs
    const voiceMap: Record<string, string> = {
      ali: "pNInz6obpgDQGcFmaJgB", // Adam
      maya: "hpp4J3VqNfWAUOO0d1Us", // Bella
      omar: "JBFqnCBsd6RMkjVDRZzb", // George
    };
    const resolvedVoiceId = voiceMap[voiceId] || voiceId;

    const generation = await prisma.audioGeneration.create({
      data: {
        userId,
        inputText: "[Audio File Upload]",
        normalizedText: "[Audio File Upload]",
        textHash: `STS-${Date.now()}`,
        charactersCount,
        voiceId,
        provider: "elevenlabs-sts",
        status: "processing",
      }
    });

    const startTime = Date.now();
    try {
      // Create FormData specifically for ElevenLabs STS API
      const elFormData = new FormData();
      elFormData.append("audio", audioFile);
      elFormData.append("model_id", "eleven_multilingual_sts_v2"); 
      // Note: eleven_multilingual_sts_v2 is essential for Arabic STS support

      // Fetch from ElevenLabs STS
      const response = await fetch(`https://api.elevenlabs.io/v1/speech-to-speech/${resolvedVoiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY || "",
        },
        body: elFormData
      });

      if (!response.ok) {
        let errorMsg = "ElevenLabs API Error";
        try {
          const errText = await response.text();
          console.error("ElevenLabs STS Error:", errText);
          const errjson = JSON.parse(errText);
          if (errjson?.detail?.status === "missing_permissions" || errjson?.detail?.message?.includes("speech_to_speech")) {
            return NextResponse.json(
              { error: "Your ElevenLabs API Key does not have Speech-to-Speech permissions enabled. This feature requires a Creator Tier or higher on ElevenLabs." },
              { status: 403 }
            );
          }
          errorMsg = `ElevenLabs API Error: ${response.status} ${errText}`;
        } catch(e) {
          errorMsg = `ElevenLabs API Error: ${response.status}`;
        }
        throw new Error(errorMsg);
      }

      const audioBuffer = await response.arrayBuffer();

      // Save locally to public/audio
      const fileName = `audio/${generation.id}.mp3`;
      const filePath = path.join(process.cwd(), "public", fileName);
      
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, Buffer.from(audioBuffer));

      // Complete state
      await prisma.audioGeneration.update({
        where: { id: generation.id },
        data: {
          status: "completed",
          audioUrl: `/${fileName}`,
          generationTimeMs: Date.now() - startTime,
          mimeType: "audio/mpeg",
          fileSizeBytes: audioBuffer.byteLength
        }
      });

      return NextResponse.json({
        success: true,
        generationId: generation.id,
        audioUrl: `/${fileName}`,
        status: "completed"
      });

    } catch (err: any) {
      // Clean up failed generation
      await prisma.audioGeneration.update({
        where: { id: generation.id },
        data: { status: "failed", errorMessage: err.message, generationTimeMs: Date.now() - startTime }
      });
      throw err;
    }

  } catch (error) {
    console.error("STS API Route Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
