import { SpeechClient, protos } from "@google-cloud/speech";

type StreamingRecognizeConfig = protos.google.cloud.speech.v1.IStreamingRecognitionConfig;

let cachedClient: SpeechClient | null = null;

function getClient(): SpeechClient {
  if (cachedClient) return cachedClient;
  cachedClient = new SpeechClient();
  return cachedClient;
}

export type SttLanguage = "ar-SA" | "ar-EG" | "ar-LB" | "ar-AE" | "en-US";

export type TranscribeChunkInput = {
  audioBase64: string;
  languageCode?: SttLanguage;
  sampleRateHertz?: number;
  encoding?: "MULAW" | "LINEAR16" | "OGG_OPUS" | "WEBM_OPUS";
};

export type TranscribeResult = {
  transcript: string;
  confidence: number;
  languageCode: string;
};

export async function transcribeAudioBuffer(input: TranscribeChunkInput): Promise<TranscribeResult> {
  const client = getClient();
  const [response] = await client.recognize({
    audio: { content: input.audioBase64 },
    config: {
      encoding: input.encoding ?? "MULAW",
      sampleRateHertz: input.sampleRateHertz ?? 8000,
      languageCode: input.languageCode ?? "ar-SA",
      alternativeLanguageCodes: input.languageCode === "en-US" ? ["ar-SA"] : ["en-US"],
      enableAutomaticPunctuation: true,
      model: "latest_long",
    },
  });

  const result = response.results?.[0];
  const alternative = result?.alternatives?.[0];
  return {
    transcript: alternative?.transcript?.trim() ?? "",
    confidence: alternative?.confidence ?? 0,
    languageCode: result?.languageCode ?? input.languageCode ?? "ar-SA",
  };
}

export type StreamHandlers = {
  onPartialTranscript?: (text: string) => void;
  onFinalTranscript: (text: string, confidence: number, languageCode: string) => void;
  onError?: (error: Error) => void;
};

export function createStreamingRecognizer(options: {
  languageCode?: SttLanguage;
  sampleRateHertz?: number;
  encoding?: "MULAW" | "LINEAR16";
  handlers: StreamHandlers;
}) {
  const client = getClient();
  const streamingConfig: StreamingRecognizeConfig = {
    config: {
      encoding: options.encoding ?? "MULAW",
      sampleRateHertz: options.sampleRateHertz ?? 8000,
      languageCode: options.languageCode ?? "ar-SA",
      alternativeLanguageCodes: options.languageCode === "en-US" ? ["ar-SA"] : ["en-US"],
      enableAutomaticPunctuation: true,
      model: "latest_long",
    },
    interimResults: true,
    singleUtterance: false,
  };

  const stream = client
    .streamingRecognize(streamingConfig)
    .on("error", (err: Error) => options.handlers.onError?.(err))
    .on("data", (data: any) => {
      const result = data.results?.[0];
      if (!result) return;
      const alt = result.alternatives?.[0];
      if (!alt?.transcript) return;
      if (result.isFinal) {
        options.handlers.onFinalTranscript(alt.transcript.trim(), alt.confidence ?? 0, result.languageCode ?? options.languageCode ?? "ar-SA");
      } else {
        options.handlers.onPartialTranscript?.(alt.transcript.trim());
      }
    });

  return {
    writeAudio(chunkBase64: string) {
      stream.write({ audioContent: Buffer.from(chunkBase64, "base64") });
    },
    close() {
      stream.end();
    },
    raw: stream,
  };
}
