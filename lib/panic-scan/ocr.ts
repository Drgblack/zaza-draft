const API_URL = "https://vision.googleapis.com/v1/images:annotate"

function getApiKey() {
  return process.env.GOOGLE_VISION_API_KEY
}

export async function performVisionOcr(imageBuffer: Buffer) {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error("Missing Google Vision API key (GOOGLE_VISION_API_KEY)")
  }

  const payload = {
    requests: [
      {
        image: {
          content: imageBuffer.toString("base64"),
        },
        features: [
          {
            type: "DOCUMENT_TEXT_DETECTION",
          },
        ],
      },
    ],
  }

  const response = await fetch(`${API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error("OCR request failed")
  }

  const data = await response.json()
  const text = data?.responses?.[0]?.fullTextAnnotation?.text
  if (!text) {
    throw new Error("OCR returned no text")
  }

  return text.trim()
}
