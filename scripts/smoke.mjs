import { buildNxthemeSarc, parseNxthemeSarc } from "@themezernx/nxtheme-builder"

const built = buildNxthemeSarc({
  name: "Smoke Theme",
  author: "Smoke Test",
  targetThemeValue: "ResidentMenu",
  assets: {},
})

const parsed = parseNxthemeSarc(built)

if (!parsed.info) {
  throw new Error("Smoke test failed: missing manifest info")
}

if (parsed.info.ThemeName !== "Smoke Theme") {
  throw new Error(`Smoke test failed: unexpected ThemeName '${parsed.info.ThemeName}'`)
}

if (parsed.info.Author !== "Smoke Test") {
  throw new Error(`Smoke test failed: unexpected Author '${parsed.info.Author}'`)
}

if (parsed.info.Target !== "ResidentMenu") {
  throw new Error(`Smoke test failed: unexpected Target '${parsed.info.Target}'`)
}

console.log("Smoke test passed: build + parse round trip works.")

