const fs = require("fs")
const path = require("path")

const homeDir = process.env.USERPROFILE || process.env.HOME || "."
const defaultDataDir = path.join(homeDir, "Downloads", "names")
const dataDir = process.env.NAME_SOURCE_DIR || defaultDataDir
const outputPath = process.env.NAME_GENDER_OUTPUT || path.join("src", "generated", "name-gender.ts")
const minCount = Number(process.env.NAME_MIN_COUNT ?? 200)
const confidenceRatio = Number(process.env.NAME_CONFIDENCE_RATIO ?? 0.95)

function fail(message) {
  console.error(message)
  process.exit(1)
}

if (!fs.existsSync(dataDir)) {
  fail(`Name data directory not found: ${dataDir}`)
}

const files = fs.readdirSync(dataDir).filter((file) => /^yob\d{4}\.txt$/.test(file))
if (!files.length) {
  fail(`No yob*.txt files found in ${dataDir}`)
}

const nameStats = new Map()

files.sort().forEach((file) => {
  const content = fs.readFileSync(path.join(dataDir, file), "utf8")
  content.split(/\r?\n/).forEach((line) => {
    if (!line.trim()) {
      return
    }
    const parts = line.split(",")
    if (parts.length < 3) {
      return
    }
    const name = parts[0].trim()
    const sex = parts[1]
    const count = Number(parts[2])
    if (!name || !count) {
      return
    }
    const key = name.toLowerCase()
    const data = nameStats.get(key) ?? { m: 0, f: 0 }
    if (sex === "M") {
      data.m += count
    } else if (sex === "F") {
      data.f += count
    }
    nameStats.set(key, data)
  })
})

const entries = Array.from(nameStats.entries())
const filtered = entries
  .map(([name, { m, f }]) => {
    const total = m + f
    const isValid = total >= minCount
    if (!isValid) {
      return null
    }

    const ratio = total === 0 ? 0 : Math.max(m / total, f / total)
    if (ratio < confidenceRatio) {
      return { name, value: "u" }
    }

    if (m > f) {
      return { name, value: "m" }
    }

    if (f > m) {
      return { name, value: "f" }
    }

    return { name, value: "u" }
  })
  .filter(Boolean)
  .sort((a, b) => a.name.localeCompare(b.name))

const generatedDir = path.dirname(outputPath)
if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir, { recursive: true })
}

const entriesText = filtered
  .map((entry) => `  "${entry.name}": "${entry.value}"`)
  .join(",\n")

const fileContents = `/**
 * DO NOT EDIT
 * This file is generated via scripts/build-name-gender.js
 * Source: ${dataDir}
 * Thresholds: minCount=${minCount}, confidenceRatio=${confidenceRatio}
 */

export const NAME_GENDER: Record<string, "m" | "f" | "u"> = {
${entriesText}
}

export const NAME_GENDER_MIN_COUNT = ${minCount}
export const NAME_GENDER_CONFIDENCE_RATIO = ${confidenceRatio}

`

fs.writeFileSync(outputPath, fileContents, "utf8")
console.log(`Generated ${filtered.length} name entries -> ${outputPath}`)
