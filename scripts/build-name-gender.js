const fs = require("fs")
const path = require("path")

const homeDir = process.env.USERPROFILE || process.env.HOME || "."
const defaultDataDir = path.join(homeDir, "Downloads", "names")
const dataDir = process.env.NAME_SOURCE_DIR || defaultDataDir

// Optional European list (repo-local by default)
const defaultEuropeanList = path.join(process.cwd(), "data", "names", "european_names_list.txt")
const europeanListPath = process.env.NAME_EU_LIST || defaultEuropeanList

const outputPath = process.env.NAME_GENDER_OUTPUT || path.join("src", "generated", "name-gender.ts")
const minCount = Number(process.env.NAME_MIN_COUNT ?? 200)
const confidenceRatio = Number(process.env.NAME_CONFIDENCE_RATIO ?? 0.95)

// How strongly to weight EU list counts vs SSA counts
const euWeight = Number(process.env.NAME_EU_WEIGHT ?? 3)

function fail(message) {
  console.error(message)
  process.exit(1)
}

function addCount(map, rawName, sex, count, weight = 1) {
  const name = (rawName || "").trim()
  if (!name) return
  const n = Number(count)
  if (!Number.isFinite(n) || n <= 0) return

  const key = name.toLowerCase()
  const data = map.get(key) ?? { m: 0, f: 0 }

  if (sex === "M") data.m += n * weight
  else if (sex === "F") data.f += n * weight

  map.set(key, data)
}

function parseNameLines(content, map, weight = 1) {
  content.split(/\r?\n/).forEach((line) => {
    if (!line.trim()) return
    const parts = line.split(",")
    if (parts.length < 3) return

    const name = parts[0].trim()
    const sex = String(parts[1] || "").trim().toUpperCase()
    const count = parts[2]

    addCount(map, name, sex, count, weight)
  })
}

if (!fs.existsSync(dataDir)) {
  fail(`Name data directory not found: ${dataDir}`)
}

const files = fs.readdirSync(dataDir).filter((file) => /^yob\d{4}\.txt$/.test(file))
if (!files.length) {
  fail(`No yob*.txt files found in ${dataDir}`)
}

const nameStats = new Map()

// 1) SSA yobYYYY.txt corpus
files
  .sort()
  .forEach((file) => {
    const content = fs.readFileSync(path.join(dataDir, file), "utf8")
    parseNameLines(content, nameStats, 1)
  })

// 2) Optional European list corpus (repo-local)
let euLoaded = false
if (europeanListPath && fs.existsSync(europeanListPath)) {
  const euContent = fs.readFileSync(europeanListPath, "utf8")
  parseNameLines(euContent, nameStats, euWeight)
  euLoaded = true
}

// Build final table
const entries = Array.from(nameStats.entries())
const filtered = entries
  .map(([name, { m, f }]) => {
    const total = m + f
    const isValid = total >= minCount
    if (!isValid) return null

    const ratio = total === 0 ? 0 : Math.max(m / total, f / total)
    if (ratio < confidenceRatio) return { name, value: "u" }

    if (m > f) return { name, value: "m" }
    if (f > m) return { name, value: "f" }

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
 * Source (SSA): ${dataDir}
 * Source (EU): ${euLoaded ? europeanListPath : "NOT FOUND"}
 * Thresholds: minCount=${minCount}, confidenceRatio=${confidenceRatio}
 * EU weighting: NAME_EU_WEIGHT=${euWeight}
 */

export const NAME_GENDER: Record<string, "m" | "f" | "u"> = {
${entriesText}
}

export const NAME_GENDER_MIN_COUNT = ${minCount}
export const NAME_GENDER_CONFIDENCE_RATIO = ${confidenceRatio}
export const NAME_EU_WEIGHT = ${euWeight}

export function inferGenderFromName(rawName: string | null | undefined): "m" | "f" | "u" {
  const normalized = (rawName || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "")
  return NAME_GENDER[normalized] ?? "u"
}

`

fs.writeFileSync(outputPath, fileContents, "utf8")
console.log(
  `Generated ${filtered.length} name entries -> ${outputPath} (EU list ${euLoaded ? "included" : "missing"})`
)
