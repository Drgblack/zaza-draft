const API_URL = "https://speech.googleapis.com/v1/speech:recognize"

function getApiKey() {
  return process.env.GOOGLE_SPEECH_TO_TEXT_API_KEY
}

function resolveEncoding(contentType: string) {
  const normalized = contentType.toLowerCase()
  if (normalized.includes("wav")) {
    return "LINEAR16"
  }
  if (normalized.includes("mpeg") || normalized.includes("mp3")) {
    return "MP3"
  }
  if (normalized.includes("m4a") || normalized.includes("aac")) {
    return "MPEG4"
  }
  if (normalized.includes("webm")) {
    return "WEBM_OPUS"
  }
  return "ENCODING_UNSPECIFIED"
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  contentType: string,
  languageCode: string,
) {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error("Missing Google Speech-to-Text API key (GOOGLE_SPEECH_TO_TEXT_API_KEY)")
  }

  const encoding = resolveEncoding(contentType)

  const payload = {
    config: {
      encoding,
      languageCode,
      enableAutomaticPunctuation: true,
      audioChannelCount: 1,
      sampleRateHertz: 16000,
    },
    audio: {
      content: audioBuffer.toString("base64"),
    },
  }

  const response = await fetch(`${API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error("Speech transcription failed")
  }

  const data = await response.json()
  const results = data?.results
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error("Speech API returned no transcript")
  }

  const transcripts = results
    .map((result: any) => result?.alternatives?.[0]?.transcript)
    .filter(Boolean)

  return transcripts.join(" ").trim()
}
