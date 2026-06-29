import {
  buildNxthemeSarc,
  getNxthemeFilename,
  type NxthemeAssetKey,
} from "@themezernx/nxtheme-builder"
import type { SwitchThemeFormData } from "~/types/switch-theme"

const fileToBytes = async (file: File): Promise<Uint8Array> => {
  return new Uint8Array(await file.arrayBuffer())
}

const bytesToArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
    const out = new Uint8Array(bytes.byteLength)
    out.set(bytes)
    return out.buffer
}

export const useNxthemeBuilder = () => {
  const buildAndDownload = async (formData: SwitchThemeFormData): Promise<string> => {
    const hasBackground = Boolean(formData.assets.backgroundImage)
    const hasLayout = Boolean(formData.layoutJson.trim())
    if (!hasBackground && !hasLayout) {
      throw new Error("Provide a background image or a layout JSON file.")
    }

    const preparedAssets: Partial<Record<NxthemeAssetKey, Uint8Array>> = {}
    for (const [key, value] of Object.entries(formData.assets) as [NxthemeAssetKey, File | null][]) {
      if (!value) continue
      preparedAssets[key] = await fileToBytes(value)
    }

    const buffer = buildNxthemeSarc({
      name: formData.name.trim(),
      author: formData.author.trim(),
      targetThemeValue: formData.target,
      layoutJson: formData.layoutJson.trim() || undefined,
      commonJson: formData.commonJson.trim() || undefined,
      assets: preparedAssets,
    })

    const filename = getNxthemeFilename({
      themeName: formData.name.trim(),
      authorName: formData.author.trim(),
      targetName: formData.target,
      themeHexId: "local",
    })

    const blob = new Blob([bytesToArrayBuffer(buffer)], { type: "application/octet-stream" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)

    return filename
  }

  return {
    buildAndDownload,
  }
}


