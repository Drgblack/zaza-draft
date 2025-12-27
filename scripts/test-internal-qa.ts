import assert from "node:assert"
import { isInternalQaUid, shouldRespectUsageLimit } from "../lib/auth/internal-qa"

function resetEnv() {
  delete process.env.INTERNAL_QA_UIDS
}

async function main() {
  resetEnv()
  assert.strictEqual(isInternalQaUid("uid123"), false, "No QA list means default is false")
  assert.strictEqual(shouldRespectUsageLimit("uid123"), true, "Usage limit should be enforced without QA flag")

  process.env.INTERNAL_QA_UIDS = "uid123,qa-user"
  assert.strictEqual(isInternalQaUid("uid123"), true, "Exact match should return true")
  assert.strictEqual(isInternalQaUid("qa-user"), true)
  assert.strictEqual(isInternalQaUid("other"), false)
  assert.strictEqual(shouldRespectUsageLimit("uid123"), false, "QA users bypass usage checks")
  assert.strictEqual(shouldRespectUsageLimit("other"), true)

  console.log("Internal QA allowlist logic verified.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
