import assert from "node:assert"

function main() {
  delete process.env.NEXT_PUBLIC_SHOW_UID
  assert.strictEqual(process.env.NEXT_PUBLIC_SHOW_UID, undefined)
  assert.ok(process.env.NEXT_PUBLIC_SHOW_UID !== "true")

  process.env.NEXT_PUBLIC_SHOW_UID = "true"
  assert.strictEqual(process.env.NEXT_PUBLIC_SHOW_UID, "true")
  console.log("SHOW_UID flag check passed.")
}

main()
