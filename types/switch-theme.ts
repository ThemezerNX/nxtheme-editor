import {
  type NxthemeAssetKey,
  type NxthemeTargetName,
  NXTHEME_ASSET_FILENAMES,
  NXTHEME_ASSET_KEYS_BY_TARGET,
} from "@themezernx/nxtheme-builder"

export type SwitchThemeTarget = NxthemeTargetName

export const SWITCH_TARGETS: SwitchThemeTarget[] = [
  "ResidentMenu",
  "Entrance",
  "Flaunch",
  "Set",
  "Notification",
  "MyPage",
  "Psl",
]

export const TARGET_LABELS: Record<SwitchThemeTarget, { title: string; icon: string }> = {
  ResidentMenu: { title: "Home Menu", icon: "i-mdi-home" },
  Entrance: { title: "Lockscreen", icon: "i-mdi-lock" },
  Flaunch: { title: "All Apps", icon: "i-mdi-apps" },
  Set: { title: "Settings", icon: "i-mdi-cog" },
  Notification: { title: "News", icon: "i-mdi-newspaper-variant" },
  MyPage: { title: "User Page", icon: "i-mdi-account" },
  Psl: { title: "Player Selection", icon: "i-mdi-account-multiple" },
}

export type ThemeAssets = Partial<Record<NxthemeAssetKey, File | null>>

export type SwitchThemeFormData = {
  name: string
  author: string
  target: SwitchThemeTarget
  layoutJson: string
  commonJson: string
  assets: ThemeAssets
}

export type AssetSizingRule = {
  width: number
  height: number
  mimeType: "image/jpeg" | "image/png"
  fileName: string
}

export const ASSET_SIZING_RULES: Record<NxthemeAssetKey, AssetSizingRule> = {
  backgroundImage: {
    width: 1280,
    height: 720,
    mimeType: "image/jpeg",
    fileName: "image.jpg",
  },
  albumIcon: { width: 64, height: 56, mimeType: "image/png", fileName: "album.png" },
  newsIcon: { width: 64, height: 56, mimeType: "image/png", fileName: "news.png" },
  shopIcon: { width: 64, height: 56, mimeType: "image/png", fileName: "shop.png" },
  controllerIcon: { width: 64, height: 56, mimeType: "image/png", fileName: "controller.png" },
  settingsIcon: { width: 64, height: 56, mimeType: "image/png", fileName: "settings.png" },
  powerIcon: { width: 64, height: 56, mimeType: "image/png", fileName: "power.png" },
  nsoIcon: { width: 64, height: 56, mimeType: "image/png", fileName: "nso.png" },
  cardIcon: { width: 64, height: 56, mimeType: "image/png", fileName: "card.png" },
  shareIcon: { width: 64, height: 56, mimeType: "image/png", fileName: "share.png" },
  homeIcon: { width: 184, height: 168, mimeType: "image/png", fileName: "lock.png" },
}

export const ASSET_DISPLAY_NAMES: Record<NxthemeAssetKey, string> = {
  backgroundImage: "Background",
  albumIcon: "Album",
  newsIcon: "News",
  shopIcon: "eShop",
  controllerIcon: "Controllers",
  settingsIcon: "Settings",
  powerIcon: "Power",
  nsoIcon: "NSO",
  cardIcon: "Game Card",
  shareIcon: "Share",
  homeIcon: "Home",
}

export const ASSET_ICON_PRESETS: Partial<Record<NxthemeAssetKey, string>> = {
  albumIcon: "applets/album.png",
  newsIcon: "applets/news.png",
  shopIcon: "applets/shop.png",
  controllerIcon: "applets/controller.png",
  settingsIcon: "applets/settings.png",
  powerIcon: "applets/power.png",
  nsoIcon: "applets/online.png",
  cardIcon: "applets/card.png",
  shareIcon: "applets/share.png",
  homeIcon: "applets/home.png",
}

export const NXTHEME_ASSET_KEYS = Object.keys(NXTHEME_ASSET_FILENAMES) as NxthemeAssetKey[]

export const getAllowedAssetKeysByTarget = (target: SwitchThemeTarget): NxthemeAssetKey[] => {
  const allowed = new Set<NxthemeAssetKey>([
    ...NXTHEME_ASSET_KEYS_BY_TARGET[target],
    "backgroundImage",
  ])
  return NXTHEME_ASSET_KEYS.filter((key) => allowed.has(key))
}

