import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("audio") as Blob | null;

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    if (!env.server.GROQ_API_KEY) {
      return NextResponse.json({ error: "Groq API key is missing from environment" }, { status: 500 });
    }

    const groqFormData = new FormData();
    groqFormData.append("file", file, "audio.mp3");
    groqFormData.append("model", "whisper-large-v3-turbo"); // Groq's fast whisper
    groqFormData.append("language", "ar");
    groqFormData.append("response_format", "json");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.server.GROQ_API_KEY}`,
      },
      body: groqFormData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Groq Whisper API Error:", errorText);
        return NextResponse.json({ error: `Groq STT failed: ${response.statusText}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ text: data.text });
  } catch (error: any) {
    console.error("STT Route Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
