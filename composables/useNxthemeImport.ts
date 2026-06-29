import {
  parseNxthemeSarc,
  NXTHEME_ASSET_FILENAMES,
  type NxthemeAssetKey,
} from "@themezernx/nxtheme-builder"
import type { SwitchThemeFormData, SwitchThemeTarget, ThemeAssets } from "~/types/switch-theme"

const validTargets: SwitchThemeTarget[] = [
  "ResidentMenu",
  "Entrance",
  "Flaunch",
  "Set",
  "Notification",
  "MyPage",
  "Psl",
]

const bytesToArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
    const out = new Uint8Array(bytes.byteLength)
    out.set(bytes)
    return out.buffer
}

const toAssetFile = (assetKey: NxthemeAssetKey, data: Uint8Array): File => {
  const fileName = NXTHEME_ASSET_FILENAMES[assetKey]
  const mimeType = fileName.endsWith(".jpg") ? "image/jpeg" : "image/png"
  return new File([bytesToArrayBuffer(data)], fileName, { type: mimeType })
}

export const useNxthemeImport = () => {
  const importNxtheme = async (
    file: File,
    currentForm: SwitchThemeFormData,
  ): Promise<{ nextForm: SwitchThemeFormData; warning?: string }> => {
    const parsed = parseNxthemeSarc(new Uint8Array(await file.arrayBuffer()))
    if (!parsed.info) {
      throw new Error("Invalid NXTheme: missing manifest.json")
    }

    const assets: ThemeAssets = {}
    for (const [key, value] of Object.entries(parsed.assets) as [NxthemeAssetKey, Uint8Array][]) {
      assets[key] = toAssetFile(key, value)
    }

    const target = validTargets.includes(parsed.info.Target as SwitchThemeTarget)
      ? (parsed.info.Target as SwitchThemeTarget)
      : currentForm.target

    const warning = parsed.unsupportedFiles.length > 0
      ? `Ignored unsupported files: ${parsed.unsupportedFiles.join(", ")}`
      : undefined

    return {
      nextForm: {
        ...currentForm,
        name: parsed.info.ThemeName || currentForm.name,
        author: parsed.info.Author || currentForm.author,
        target,
        layoutJson: parsed.layoutJson || "",
        commonJson: parsed.commonJson || "",
        assets: {
          ...currentForm.assets,
          ...assets,
        },
      },
      warning,
    }
  }

  return {
    importNxtheme,
  }
}


