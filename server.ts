import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import { Mp3Encoder } from "@breezystack/lamejs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const ALLOWED_VOICES = new Set(["Kore", "Puck", "Charon", "Fenrir", "Zephyr"]);
const ALLOWED_BITRATES = new Set([128, 192, 320]);

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: "v1beta",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

interface ParsedWav {
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
  pcmData: Buffer;
}

function parseWavBuffer(wavBuffer: Buffer): ParsedWav {
  if (
    wavBuffer.length < 44 ||
    wavBuffer.toString("ascii", 0, 4) !== "RIFF" ||
    wavBuffer.toString("ascii", 8, 12) !== "WAVE"
  ) {
    // Fallback to Gemini 3.8 TTS default spec (24kHz mono 16-bit PCM)
    return {
      channels: 1,
      sampleRate: 24000,
      bitsPerSample: 16,
      pcmData: wavBuffer.subarray(44),
    };
  }

  let channels = 1;
  let sampleRate = 24000;
  let bitsPerSample = 16;
  let pcmData: Buffer | null = null;

  let offset = 12;
  while (offset + 8 <= wavBuffer.length) {
    const chunkId = wavBuffer.toString("ascii", offset, offset + 4);
    const chunkSize = wavBuffer.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    const dataEnd = Math.min(dataStart + chunkSize, wavBuffer.length);

    if (chunkId === "fmt " && chunkSize >= 16 && dataStart + 16 <= wavBuffer.length) {
      channels = wavBuffer.readUInt16LE(dataStart + 2);
      sampleRate = wavBuffer.readUInt32LE(dataStart + 4);
      bitsPerSample = wavBuffer.readUInt16LE(dataStart + 14);
    } else if (chunkId === "data") {
      pcmData = wavBuffer.subarray(dataStart, dataEnd);
      break;
    }

    // Chunks are word-aligned (even byte boundary)
    offset = dataStart + chunkSize + (chunkSize % 2);
  }

  return {
    channels,
    sampleRate,
    bitsPerSample,
    pcmData: pcmData ?? wavBuffer.subarray(44),
  };
}

function encodeWavToMp3(wavBuffer: Buffer, bitrateKbps: number): {
  mp3Buffer: Buffer;
  durationSeconds: number;
  sampleRate: number;
  channels: number;
} {
  const { channels, sampleRate, bitsPerSample, pcmData } = parseWavBuffer(wavBuffer);

  // Ensure aligned byte length for 16-bit samples
  const sampleCount = Math.floor(pcmData.length / 2);
  const alignedBytes = Buffer.allocUnsafe(sampleCount * 2);
  pcmData.copy(alignedBytes, 0, 0, sampleCount * 2);

  const int16 = new Int16Array(
    alignedBytes.buffer,
    alignedBytes.byteOffset,
    sampleCount
  );

  const bytesPerSample = Math.max(1, bitsPerSample / 8);
  const totalFrames = sampleCount / Math.max(1, channels);
  const durationSeconds = totalFrames / Math.max(1, sampleRate);

  const mp3Encoder = new Mp3Encoder(channels, sampleRate, bitrateKbps);
  const mp3Chunks: Uint8Array[] = [];
  const blockSize = 1152;

  if (channels === 1) {
    for (let i = 0; i < int16.length; i += blockSize) {
      const slice = int16.subarray(i, i + blockSize);
      const mp3Buf = mp3Encoder.encodeBuffer(slice);
      if (mp3Buf.length > 0) {
        mp3Chunks.push(mp3Buf);
      }
    }
  } else {
    // De-interleave stereo PCM
    const frames = Math.floor(int16.length / 2);
    const left = new Int16Array(frames);
    const right = new Int16Array(frames);
    for (let i = 0; i < frames; i++) {
      left[i] = int16[i * 2];
      right[i] = int16[i * 2 + 1];
    }
    for (let i = 0; i < frames; i += blockSize) {
      const leftSlice = left.subarray(i, i + blockSize);
      const rightSlice = right.subarray(i, i + blockSize);
      const mp3Buf = mp3Encoder.encodeBuffer(leftSlice, rightSlice);
      if (mp3Buf.length > 0) {
        mp3Chunks.push(mp3Buf);
      }
    }
  }

  const endBuf = mp3Encoder.flush();
  if (endBuf.length > 0) {
    mp3Chunks.push(endBuf);
  }

  // Fallback check on duration in case bitsPerSample differed
  const computedDuration =
    pcmData.length / (sampleRate * channels * bytesPerSample);

  return {
    mp3Buffer: Buffer.concat(mp3Chunks.map((chunk) => Buffer.from(chunk))),
    durationSeconds: Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : computedDuration,
    sampleRate,
    channels,
  };
}

interface DialogueTurnPayload {
  speaker: string;
  text: string;
}

interface SpeakerConfigPayload {
  name: string;
  voiceName: string;
  style?: string;
}

interface TtsRequestBody {
  mode?: "single" | "dialogue";
  text?: string;
  voiceName?: string;
  style?: string;
  modelTier?: "lite" | "studio";
  bitrateKbps?: number;
  speaker1?: SpeakerConfigPayload;
  speaker2?: SpeakerConfigPayload;
  turns?: DialogueTurnPayload[];
}

function extractInlineAudioBase64(response: {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { data?: string; mimeType?: string };
      }>;
    };
  }>;
}): string | undefined {
  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) return undefined;
  for (const part of parts) {
    if (part.inlineData?.data) {
      return part.inlineData.data;
    }
  }
  return undefined;
}

function formatErrorResponse(err: unknown): { status: number; message: string } {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const lower = rawMessage.toLowerCase();

  if (lower.includes("gemini_api_key") || lower.includes("api_key_invalid") || lower.includes("api key")) {
    return {
      status: 401,
      message: "Voice generation requires a valid GEMINI_API_KEY in Settings > Secrets.",
    };
  }
  if (lower.includes("permission_denied") || lower.includes("403")) {
    return {
      status: 403,
      message: "API key permission denied. Please verify your key in Settings > Secrets.",
    };
  }
  if (lower.includes("resource_exhausted") || lower.includes("429")) {
    return {
      status: 429,
      message: "Rate limit reached for voice synthesis. Please wait a moment and try again.",
    };
  }
  if (lower.includes("not_found") || lower.includes("404")) {
    return {
      status: 404,
      message: "The requested TTS model was not found or is temporarily unavailable.",
    };
  }
  return {
    status: 500,
    message: rawMessage || "Failed to generate voice audio.",
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ ok: true, service: "cadence-studio" });
  });

  app.post("/api/tts", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as TtsRequestBody;
      const mode = body.mode === "dialogue" ? "dialogue" : "single";
      const bitrateKbps = ALLOWED_BITRATES.has(Number(body.bitrateKbps))
        ? Number(body.bitrateKbps)
        : 192;

      const ai = getGeminiClient();
      let modelUsed = "gemini-3.8-flash-lite-tts";
      let base64Wav: string | undefined;

      if (mode === "single") {
        const text = (body.text ?? "").trim();
        if (!text) {
          res.status(400).json({ error: "Please enter text to convert to speech." });
          return;
        }
        if (text.length > 5000) {
          res.status(400).json({ error: "Script exceeds the 5,000 character limit per clip." });
          return;
        }

        const voiceName = ALLOWED_VOICES.has(body.voiceName ?? "")
          ? (body.voiceName as string)
          : "Kore";
        const style = (body.style ?? "").trim();
        modelUsed =
          body.modelTier === "studio"
            ? "gemini-3.8-flash-tts"
            : "gemini-3.8-flash-lite-tts";

        const partPayload: {
          text: string;
          speechMetadata?: { style: string };
        } = { text };

        if (style) {
          partPayload.speechMetadata = { style };
        }

        const response = await ai.models.generateContent({
          model: modelUsed,
          contents: [
            {
              role: "user",
              parts: [partPayload],
            },
          ],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        });

        base64Wav = extractInlineAudioBase64(response);
      } else {
        const turns = Array.isArray(body.turns) ? body.turns : [];
        const validTurns = turns
          .map((t) => ({
            speaker: (t.speaker ?? "").trim(),
            text: (t.text ?? "").trim(),
          }))
          .filter((t) => t.speaker && t.text);

        if (validTurns.length === 0) {
          res.status(400).json({ error: "Add at least one dialogue line with text." });
          return;
        }

        const totalChars = validTurns.reduce((sum, t) => sum + t.text.length, 0);
        if (totalChars > 5000) {
          res.status(400).json({ error: "Dialogue script exceeds the 5,000 character limit." });
          return;
        }

        const s1Name = (body.speaker1?.name ?? "Alex").trim() || "Alex";
        const s1Voice = ALLOWED_VOICES.has(body.speaker1?.voiceName ?? "")
          ? (body.speaker1!.voiceName as string)
          : "Puck";
        const s1Style = (body.speaker1?.style ?? "").trim();

        const s2NameRaw = (body.speaker2?.name ?? "Sam").trim() || "Sam";
        const s2Name = s2NameRaw === s1Name ? `${s2NameRaw} 2` : s2NameRaw;
        const s2Voice = ALLOWED_VOICES.has(body.speaker2?.voiceName ?? "")
          ? (body.speaker2!.voiceName as string)
          : "Kore";
        const s2Style = (body.speaker2?.style ?? "").trim();

        modelUsed = "gemini-3.8-flash-tts";

        const parts = validTurns.map((turn) => {
          const isSpeakerOne = turn.speaker === s1Name || turn.speaker === "speaker1";
          const speakerLabel = isSpeakerOne ? s1Name : s2Name;
          const speakerStyle = isSpeakerOne ? s1Style : s2Style;
          const cleanLine = turn.text.startsWith(`${speakerLabel}:`)
            ? turn.text
            : `${speakerLabel}: ${turn.text}`;

          return {
            text: cleanLine,
            speechMetadata: {
              speaker: speakerLabel,
              ...(speakerStyle ? { style: speakerStyle } : {}),
            },
          };
        });

        const response = await ai.models.generateContent({
          model: modelUsed,
          contents: [
            {
              role: "user",
              parts,
            },
          ],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: [
                  {
                    speaker: s1Name,
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: s1Voice },
                    },
                  },
                  {
                    speaker: s2Name,
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: s2Voice },
                    },
                  },
                ],
              },
            },
          },
        });

        base64Wav = extractInlineAudioBase64(response);
      }

      if (!base64Wav) {
        res.status(502).json({
          error: "The speech model did not return audio data. Please try adjusting your script.",
        });
        return;
      }

      const wavBuffer = Buffer.from(base64Wav, "base64");
      const { mp3Buffer, durationSeconds, sampleRate } = encodeWavToMp3(
        wavBuffer,
        bitrateKbps
      );

      res.json({
        mp3Base64: mp3Buffer.toString("base64"),
        wavBase64: base64Wav,
        durationSeconds,
        mp3SizeBytes: mp3Buffer.length,
        wavSizeBytes: wavBuffer.length,
        sampleRate,
        bitrateKbps,
        modelUsed,
      });
    } catch (error) {
      const formatted = formatErrorResponse(error);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  const distDir = path.resolve(__dirname, "dist");
  const isProd = process.env.NODE_ENV === "production" && fs.existsSync(distDir);

  if (isProd) {
    app.use(express.static(distDir));
    app.get("/{*path}", (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Cadence Studio server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
