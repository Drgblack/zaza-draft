import assert from "node:assert"
import { DEFAULT_DRAFT_MODE, resolveDraftMode } from "../lib/draft-mode"

assert(resolveDraftMode(undefined) === DEFAULT_DRAFT_MODE, "Missing mode should default to parent message")
assert(resolveDraftMode("parent_message") === "parent_message", "Parent mode should parse correctly")
assert(resolveDraftMode("report_comment") === "report_comment", "Report mode should parse correctly")
assert(resolveDraftMode("invalid_option") === null, "Invalid mode should return null")

console.log("Draft mode validation passed.")
