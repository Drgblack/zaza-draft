const baseUrl = process.env.API_BASE_URL ?? "http://localhost:3000"

const log = (message) => console.log(`[e2e-smoke] ${message}`)

async function run() {
  log(`Checking health endpoint at ${baseUrl}/api/health`)
  const healthResponse = await fetch(`${baseUrl}/api/health`)
  if (!healthResponse.ok) {
    throw new Error(`Health check failed (${healthResponse.status})`)
  }
  const healthPayload = await healthResponse.json()
  log(`Health status: ${healthPayload.status}`)

  const token = process.env.TEST_ID_TOKEN
  if (!token) {
    log("TEST_ID_TOKEN not provided; skipping authenticated generate check.")
    return
  }

  log("Running authenticated generate test")
  const generateResponse = await fetch(`${baseUrl}/api/draft/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      situation: "Test draft to verify API readiness.",
      tone: "professional",
      language: "en",
    }),
  })

  const generatePayload = await generateResponse.json()
  if (!generateResponse.ok || !generatePayload?.success) {
    throw new Error(`Generate failed: ${generatePayload?.error?.code || generateResponse.status}`)
  }

  log(`Generate succeeded with model ${generatePayload.data.metadata.modelUsed}`)
}

run().catch((error) => {
  console.error("[e2e-smoke] Error:", error)
  process.exit(1)
})
