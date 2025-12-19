import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const exts = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".mdx"])
const rx = /[\u2013\u2014]/g

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue
    if (["node_modules", ".next", "build", "dist", ".vercel", "coverage"].includes(e.name)) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full)
    else if (exts.has(path.extname(e.name))) {
      const s = fs.readFileSync(full, "utf8")
      if (rx.test(s)) {
        fs.writeFileSync(full, s.replace(rx, "-"), "utf8")
        console.log(`[normalize-dashes] Fixed: ${full}`)
      }
    }
  }
}

walk(ROOT)
console.log("[normalize-dashes] Complete")
