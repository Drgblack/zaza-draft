import { randomBytes } from "crypto"

const SOURCE = "zaza-draft-support"
const PREFIX = "ZD"
const RANDOM_BYTES = 4
const SUFFIX_LENGTH = 6

export function generateSupportTicketId(date = new Date()) {
  const dateSegment = date.toISOString().slice(0, 10).replace(/-/g, "")
  const randomValue = randomBytes(RANDOM_BYTES).readUInt32BE(0)
  const suffix = randomValue
    .toString(36)
    .toUpperCase()
    .padStart(SUFFIX_LENGTH, "0")
    .slice(-SUFFIX_LENGTH)

  return `${PREFIX}-${dateSegment}-${suffix}`
}

export const SUPPORT_SOURCE = SOURCE
