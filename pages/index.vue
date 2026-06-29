<script setup lang="ts">
import { NXTHEME_ASSET_FILENAMES, type NxthemeAssetKey } from "@themezernx/nxtheme-builder"
import { useNxthemeBuilder } from "~/composables/useNxthemeBuilder"
import { useNxthemeImport } from "~/composables/useNxthemeImport"
import {
    ASSET_DISPLAY_NAMES,
    ASSET_ICON_PRESETS,
    ASSET_SIZING_RULES,
    getAllowedAssetKeysByTarget,
    SWITCH_TARGETS,
    type SwitchThemeFormData,
    TARGET_LABELS,
} from "~/types/switch-theme"

const createInitialForm = (): SwitchThemeFormData => ({
    name: "",
    author: "",
    target: "ResidentMenu",
    layoutJson: "",
    commonJson: "",
    assets: {},
})

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)
const ASPECT_EPSILON = 0.0001

const form = ref<SwitchThemeFormData>(createInitialForm())
const loading = ref(false)
const error = ref("")
const warning = ref("")
const { toast } = useToast()
const importInput = ref<HTMLInputElement | null>(null)
const layoutJsonInput = ref<HTMLInputElement | null>(null)
const commonJsonInput = ref<HTMLInputElement | null>(null)
const nameInputRef = ref<HTMLInputElement | null>(null)
const authorInputRef = ref<HTMLInputElement | null>(null)
const nameInputTouched = ref(false)
const authorInputTouched = ref(false)
const previewUrls = ref<Partial<Record<NxthemeAssetKey, string>>>({})
const assetInputRefs = ref<Partial<Record<NxthemeAssetKey, HTMLInputElement | null>>>({})
const dragActive = ref<Partial<Record<NxthemeAssetKey, boolean>>>({})

const cropCanvas = ref<HTMLCanvasElement | null>(null)
const cropSource = ref("")
const cropImage = ref<HTMLImageElement | null>(null)
const cropAssetKey = ref<NxthemeAssetKey | null>(null)
const cropFileName = ref("")
const cropState = reactive({
    zoom: 1,
    minZoom: 1,
    x: 50,
    y: 50,
})

const cropDrag = reactive({
    active: false,
    pointerId: -1,
    startPointerX: 0,
    startPointerY: 0,
    startCropX: 0,
    startCropY: 0,
})

const { buildAndDownload } = useNxthemeBuilder()
const { importNxtheme } = useNxthemeImport()
const runtimeConfig = useRuntimeConfig()

const allowedAssetKeys = computed(() => getAllowedAssetKeysByTarget(form.value.target))
const backgroundAssetKey = computed<NxthemeAssetKey | null>(() => (
    allowedAssetKeys.value.includes("backgroundImage") ? "backgroundImage" : null
))
const iconAssetKeys = computed(() => allowedAssetKeys.value.filter((key) => key !== "backgroundImage"))

const presetIconUrl = (assetKey: NxthemeAssetKey): string | null => {
    const path = ASSET_ICON_PRESETS[assetKey]
    if (!path) return null
    const base = runtimeConfig.app.baseURL || "/"
    return `${base.replace(/\/$/, "")}/${path}`
}

const themezerIconUrl = computed(() => {
    const base = runtimeConfig.app.baseURL || "/"
    return `${base.replace(/\/$/, "")}/themezer-icon.png`
})

const clearPreview = (assetKey: NxthemeAssetKey) => {
    const url = previewUrls.value[assetKey]
    if (url) {
        URL.revokeObjectURL(url)
    }
    delete previewUrls.value[assetKey]
}

const setPreviewFromFile = (assetKey: NxthemeAssetKey, file: File) => {
    clearPreview(assetKey)
    previewUrls.value[assetKey] = URL.createObjectURL(file)
}

const closeCropEditor = () => {
    cropDrag.active = false
    cropDrag.pointerId = -1
    if (cropSource.value) {
        URL.revokeObjectURL(cropSource.value)
    }
    cropSource.value = ""
    cropImage.value = null
    cropAssetKey.value = null
    cropFileName.value = ""
}

const getCropRegion = () => {
    const assetKey = cropAssetKey.value
    const image = cropImage.value
    if (!assetKey || !image) return null

    const rule = ASSET_SIZING_RULES[assetKey]
    const cropWidth = rule.width / cropState.zoom
    const cropHeight = rule.height / cropState.zoom
    const maxX = Math.max(0, image.width - cropWidth)
    const maxY = Math.max(0, image.height - cropHeight)
    const cropX = clamp((cropState.x / 100) * maxX, 0, maxX)
    const cropY = clamp((cropState.y / 100) * maxY, 0, maxY)

    return {
        rule,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        maxX,
        maxY,
    }
}

const cropEditorMetrics = computed(() => {
    const image = cropImage.value
    const region = getCropRegion()
    if (!image || !region) return null

    const maxPreviewWidth = 560
    const maxPreviewHeight = 360
    const scale = Math.min(maxPreviewWidth / image.width, maxPreviewHeight / image.height, 1)

    return {
        scale,
        displayWidth: Math.max(1, Math.round(image.width * scale)),
        displayHeight: Math.max(1, Math.round(image.height * scale)),
        frameLeft: region.cropX * scale,
        frameTop: region.cropY * scale,
        frameWidth: region.cropWidth * scale,
        frameHeight: region.cropHeight * scale,
        maxX: region.maxX,
        maxY: region.maxY,
        cropX: region.cropX,
        cropY: region.cropY,
    }
})

const setCropPositionFromPixels = (cropX: number, cropY: number, maxX: number, maxY: number) => {
    const nextX = clamp(cropX, 0, maxX)
    const nextY = clamp(cropY, 0, maxY)
    cropState.x = maxX === 0 ? 50 : (nextX / maxX) * 100
    cropState.y = maxY === 0 ? 50 : (nextY / maxY) * 100
}

const startCropDrag = (event: PointerEvent) => {
    const metrics = cropEditorMetrics.value
    if (!metrics) return

    const target = event.currentTarget as HTMLElement | null
    target?.setPointerCapture(event.pointerId)

    cropDrag.active = true
    cropDrag.pointerId = event.pointerId
    cropDrag.startPointerX = event.clientX
    cropDrag.startPointerY = event.clientY
    cropDrag.startCropX = metrics.cropX
    cropDrag.startCropY = metrics.cropY
}

const onCropDragMove = (event: PointerEvent) => {
    if (!cropDrag.active || cropDrag.pointerId !== event.pointerId) return
    const metrics = cropEditorMetrics.value
    if (!metrics) return

    const deltaX = (event.clientX - cropDrag.startPointerX) / metrics.scale
    const deltaY = (event.clientY - cropDrag.startPointerY) / metrics.scale
    setCropPositionFromPixels(cropDrag.startCropX + deltaX, cropDrag.startCropY + deltaY, metrics.maxX, metrics.maxY)
}

const stopCropDrag = (event?: PointerEvent) => {
    if (event) {
        const target = event.currentTarget as HTMLElement | null
        if (cropDrag.pointerId !== -1) {
            target?.releasePointerCapture(cropDrag.pointerId)
        }
    }
    cropDrag.active = false
    cropDrag.pointerId = -1
}

const loadImageFromFile = async (file: File): Promise<HTMLImageElement> => {
    const source = URL.createObjectURL(file)
    try {
        return await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image()
            image.onload = () => resolve(image)
            image.onerror = () => reject(new Error("Failed to read image file."))
            image.src = source
        })
    } finally {
        URL.revokeObjectURL(source)
    }
}

const canvasToAssetFile = async (canvas: HTMLCanvasElement, assetKey: NxthemeAssetKey): Promise<File> => {
    const rule = ASSET_SIZING_RULES[assetKey]
    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, rule.mimeType, rule.mimeType === "image/jpeg" ? 1 : undefined)
    })
    if (!blob) {
        throw new Error("Could not encode resized image.")
    }
    return new File([blob], rule.fileName, { type: rule.mimeType })
}

const autoResizeAsset = async (assetKey: NxthemeAssetKey, image: HTMLImageElement): Promise<File> => {
    const rule = ASSET_SIZING_RULES[assetKey]
    const canvas = document.createElement("canvas")
    canvas.width = rule.width
    canvas.height = rule.height
    const context = canvas.getContext("2d")
    if (!context) {
        throw new Error("Could not initialize resize canvas.")
    }

    context.drawImage(image, 0, 0, image.width, image.height, 0, 0, rule.width, rule.height)
    return await canvasToAssetFile(canvas, assetKey)
}

const drawCropPreview = () => {
    const region = getCropRegion()
    const canvas = cropCanvas.value
    const image = cropImage.value
    if (!region || !canvas || !image) return

    const previewMaxWidth = 420
    const ratio = region.rule.width / region.rule.height
    const width = Math.min(previewMaxWidth, region.rule.width)
    const height = width / ratio
    canvas.width = Math.round(width)
    canvas.height = Math.round(height)

    const context = canvas.getContext("2d")
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(
        image,
        region.cropX,
        region.cropY,
        region.cropWidth,
        region.cropHeight,
        0,
        0,
        canvas.width,
        canvas.height,
    )
}

watch(() => [cropState.zoom, cropState.x, cropState.y, cropAssetKey.value], drawCropPreview)

watch(
    () => form.value.target,
    (target) => {
        const allowed = new Set(getAllowedAssetKeysByTarget(target))
        for (const key of Object.keys(form.value.assets) as NxthemeAssetKey[]) {
            if (!allowed.has(key)) {
                form.value.assets[key] = null
                clearPreview(key)
            }
        }
    },
)

onBeforeUnmount(() => {
    for (const key of Object.keys(previewUrls.value) as NxthemeAssetKey[]) {
        clearPreview(key)
    }
    closeCropEditor()
})

const openCropEditor = async (assetKey: NxthemeAssetKey, file: File) => {
    closeCropEditor()
    cropAssetKey.value = assetKey
    cropFileName.value = file.name
    cropSource.value = URL.createObjectURL(file)

    cropImage.value = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error("Failed to read image for crop editor."))
        image.src = cropSource.value
    })

    const rule = ASSET_SIZING_RULES[assetKey]
    cropState.minZoom = Math.max(rule.width / cropImage.value.width, rule.height / cropImage.value.height)
    cropState.zoom = Math.max(1, cropState.minZoom)
    cropState.x = 50
    cropState.y = 50
    drawCropPreview()
}

const applyCrop = async () => {
    const region = getCropRegion()
    const image = cropImage.value
    const assetKey = cropAssetKey.value
    if (!region || !image || !assetKey) return

    const canvas = document.createElement("canvas")
    canvas.width = region.rule.width
    canvas.height = region.rule.height
    const context = canvas.getContext("2d")
    if (!context) {
        throw new Error("Could not initialize export canvas.")
    }

    context.drawImage(
        image,
        region.cropX,
        region.cropY,
        region.cropWidth,
        region.cropHeight,
        0,
        0,
        region.rule.width,
        region.rule.height,
    )

    const nextFile = await canvasToAssetFile(canvas, assetKey)
    form.value.assets[assetKey] = nextFile
    setPreviewFromFile(assetKey, nextFile)
    closeCropEditor()
    toast({
        toast: "solid-success",
        title: "Success",
        description: `Updated ${ASSET_DISPLAY_NAMES[assetKey]} (${region.rule.width}x${region.rule.height})`,
    })
}

const removeAsset = (assetKey: NxthemeAssetKey) => {
    form.value.assets[assetKey] = null
    clearPreview(assetKey)
}

const setAssetInputRef = (assetKey: NxthemeAssetKey, element: HTMLInputElement | null) => {
    assetInputRefs.value[assetKey] = element
}

const openAssetPicker = (assetKey: NxthemeAssetKey) => {
    assetInputRefs.value[assetKey]?.click()
}

const handleAssetFile = async (assetKey: NxthemeAssetKey, file: File) => {
    error.value = ""
    warning.value = ""
    try {
        const image = await loadImageFromFile(file)
        const rule = ASSET_SIZING_RULES[assetKey]
        const sourceRatio = image.width / image.height
        const targetRatio = rule.width / rule.height
        const aspectMatches = Math.abs(sourceRatio - targetRatio) <= ASPECT_EPSILON

        if (aspectMatches) {
            const nextFile = await autoResizeAsset(assetKey, image)
            form.value.assets[assetKey] = nextFile
            setPreviewFromFile(assetKey, nextFile)

            if (image.width > rule.width || image.height > rule.height) {
                const message = `${ASSET_DISPLAY_NAMES[assetKey]} was bigger than the recommended ${rule.width}x${rule.height} and was automatically resized.`
                warning.value = message
                toast({
                    toast: "solid-warning",
                    title: "Asset auto-resized",
                    description: message,
                })
            } else {
                toast({
                    toast: "solid-success",
                    title: "Success",
                    description: `${ASSET_DISPLAY_NAMES[assetKey]} resized to ${rule.width}x${rule.height}`,
                })
            }
            return
        }

        await openCropEditor(assetKey, file)
    } catch (nextError) {
        error.value = nextError instanceof Error ? nextError.message : "Could not open crop editor."
    }
}

const onAssetSelected = async (assetKey: NxthemeAssetKey, event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    await handleAssetFile(assetKey, file)
    input.value = ""
}

const onAssetDragEnter = (assetKey: NxthemeAssetKey) => {
    dragActive.value[assetKey] = true
}

const onAssetDragLeave = (assetKey: NxthemeAssetKey) => {
    dragActive.value[assetKey] = false
}

const onAssetDrop = async (assetKey: NxthemeAssetKey, event: DragEvent) => {
    dragActive.value[assetKey] = false
    const file = event.dataTransfer?.files?.[0]
    if (!file) return
    await handleAssetFile(assetKey, file)
}

const onImportClick = () => {
    importInput.value?.click()
}

const onSelectLayoutJson = () => {
    layoutJsonInput.value?.click()
}

const onSelectCommonJson = () => {
    commonJsonInput.value?.click()
}

const readTextFile = async (file: File): Promise<string> => {
    return await file.text()
}

const onLayoutJsonSelected = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    try {
        form.value.layoutJson = await readTextFile(file)
        error.value = ""
        toast({
            toast: "solid-success",
            title: "Success",
            description: `Loaded ${file.name}`,
        })
    } catch (nextError) {
        error.value = nextError instanceof Error ? nextError.message : "Failed to read layout.json file."
    } finally {
        input.value = ""
    }
}

const onCommonJsonSelected = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    try {
        form.value.commonJson = await readTextFile(file)
        error.value = ""
        toast({
            toast: "solid-success",
            title: "Success",
            description: `Loaded ${file.name}`,
        })
    } catch (nextError) {
        error.value = nextError instanceof Error ? nextError.message : "Failed to read common.json file."
    } finally {
        input.value = ""
    }
}

const clearLayoutJson = () => {
    form.value.layoutJson = ""
}

const clearCommonJson = () => {
    form.value.commonJson = ""
}

const onImportSelected = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    warning.value = ""
    error.value = ""

    try {
        const result = await importNxtheme(file, form.value)
        form.value = result.nextForm
        for (const key of Object.keys(result.nextForm.assets) as NxthemeAssetKey[]) {
            const asset = result.nextForm.assets[key]
            if (asset) setPreviewFromFile(key, asset)
        }
        warning.value = result.warning || ""
        toast({
            toast: "solid-success",
            title: "Success",
            description: `Imported ${file.name}`,
        })
    } catch (nextError) {
        error.value = nextError instanceof Error ? nextError.message : "Failed to import NXTheme."
    } finally {
        input.value = ""
    }
}

const onReset = () => {
    for (const key of Object.keys(previewUrls.value) as NxthemeAssetKey[]) {
        clearPreview(key)
    }
    form.value = createInitialForm()
    closeCropEditor()
    warning.value = ""
    error.value = ""
    nameInputTouched.value = false
    authorInputTouched.value = false
}

const onBuild = async () => {
    warning.value = ""
    error.value = ""

    nameInputTouched.value = true
    authorInputTouched.value = true

    let hasNameError = false
    let hasAuthorError = false

    if (!form.value.name.trim()) {
        hasNameError = true
    }
    if (!form.value.author.trim()) {
        hasAuthorError = true
    }

    if (hasNameError || hasAuthorError) {
        await nextTick()
        if (hasNameError) {
            const inputElement = nameInputRef.value?.$el?.querySelector('input') || nameInputRef.value?.$el
            inputElement?.scrollIntoView({ behavior: "smooth", block: "center" })
            inputElement?.focus()
        } else if (hasAuthorError) {
            const inputElement = authorInputRef.value?.$el?.querySelector('input') || authorInputRef.value?.$el
            inputElement?.scrollIntoView({ behavior: "smooth", block: "center" })
            inputElement?.focus()
        }
        return
    }

    loading.value = true
    try {
        const fileName = await buildAndDownload(form.value)
        toast({
            toast: "solid-success",
            title: "Success",
            description: `Downloaded ${fileName}`,
        })
    } catch (nextError) {
        error.value = nextError instanceof Error ? nextError.message : "Failed to build NXTheme."
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <main class="relative mx-auto max-w-7xl px-4 pb-20 pt-6 text-slate-100">
        <div class="pointer-events-none fixed inset-0 z-0 bg-[#090d16]" />
        <div
            class="pointer-events-none fixed z-0"
            style="
        inset: -20vmax;
        background:
          radial-gradient(circle at 22% 50%, rgba(10, 179, 121, 0.34) 0%, rgba(10, 179, 121, 0) 44%),
          radial-gradient(circle at 78% 50%, rgba(255, 50, 204, 0.34) 0%, rgba(255, 50, 204, 0) 44%),
          radial-gradient(circle at 50% 52%, rgba(95, 94, 255, 0.18) 0%, rgba(95, 94, 255, 0) 40%);
        filter: blur(48px) saturate(115%);
      "
        />

        <div class="relative z-10">

            <header
                class="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl lg:flex-row lg:items-start lg:justify-between">
                <div class="grid gap-2">
                    <div class="flex items-center gap-2 text-2xl leading-none">
                        <n-icon name="i-lucide-sparkles" class="text-slate-200" />
                        <h1 class="text-2xl font-black">NXTheme Builder</h1>
                    </div>
                    <p class="text-sm text-slate-300">
                        Build Nintendo Switch <code class="rounded border border-slate-800 bg-slate-900/60 px-1.5 py-0.5 font-mono text-xs">.nxtheme</code> files locally.
                    </p>
                </div>
                <div class="flex flex-wrap items-center content-start gap-2 self-start">
                  <a
                      class="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-950/70 hover:text-white transition-all duration-200"
                      href="https://github.com/ThemezerNX/nxtheme-editor"
                      target="_blank"
                  >
                    <span class="i-lucide-github shrink-0 text-[1em] leading-none" />
                    <span>Source code</span>
                  </a>
                    <a
                        class="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-950/70 hover:text-white transition-all duration-200"
                        href="https://themezer.net"
                        target="_blank"
                        rel="noreferrer"
                    >
                        <img :src="themezerIconUrl" alt="Themezer" class="h-[1em] w-auto shrink-0 object-contain" />
                        <span>Themezer</span>
                    </a>
                    <a
                        class="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-950/70 hover:text-white transition-all duration-200"
                        href="https://hb-app.store/switch/NXthemes_Installer"
                        target="_blank"
                    >
                        <span class="i-lucide-github shrink-0 text-[1em] leading-none" />
                        <span>NXThemesInjector</span>
                    </a>
                </div>
            </header>

            <section
                class="mb-4 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl md:grid-cols-2">
                <label class="grid gap-1 text-sm">
        <span class="flex items-center justify-between gap-2">
          <span>Theme name</span>
          <n-badge badge="outline-warning" size="xs" class="uppercase">required*</n-badge>
        </span>
                    <n-input
                        ref="nameInputRef"
                        v-model="form.name"
                        placeholder="My Theme"
                        required
                        @blur="nameInputTouched = true"
                    />
                    <p v-if="nameInputTouched && !form.name.trim()" class="text-xs text-red-400 mt-1">Theme name is required</p>
                </label>
                <label class="grid gap-1 text-sm">
        <span class="flex items-center justify-between gap-2">
          <span>Author</span>
          <n-badge badge="outline-warning" size="xs" class="uppercase">required*</n-badge>
        </span>
                    <n-input
                        ref="authorInputRef"
                        v-model="form.author"
                        placeholder="Your name"
                        required
                        @blur="authorInputTouched = true"
                    />
                    <p v-if="authorInputTouched && !form.author.trim()" class="text-xs text-red-400 mt-1">Author is required</p>
                </label>
            </section>

            <section class="mb-4 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
                <h2 class="text-lg font-semibold">Target</h2>
                <n-tabs v-model="form.target">
                    <n-tabs-list
                        class="!grid !h-auto !w-full !gap-1 !rounded-xl !border !border-slate-850 !bg-slate-950/60 !p-1 sm:!grid-cols-2 lg:!grid-cols-4 xl:!grid-cols-7">
                        <n-tabs-trigger
                            v-for="target in SWITCH_TARGETS"
                            :key="target"
                            :value="target"
                            class="!h-9 !min-w-0 !justify-center !gap-1.5 !rounded-lg !border-0 !bg-transparent !px-2 !py-1 !text-xs !text-slate-300 !shadow-none !ring-0 hover:!bg-slate-800/50 data-[state=active]:!bg-primary/25 data-[state=active]:!text-primary-200 sm:!text-sm"
                        >
                            <span :class="[TARGET_LABELS[target].icon, 'shrink-0 text-sm leading-none']" />
                            <span class="min-w-0 truncate font-semibold">{{ TARGET_LABELS[target].title }}</span>
                        </n-tabs-trigger>
                    </n-tabs-list>
                </n-tabs>
            </section>

            <section class="mb-4 grid items-stretch gap-3 lg:grid-cols-[minmax(0,1.7fr)_auto_minmax(320px,1fr)]">
                <article class="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
                    <h2 class="text-lg font-semibold">Background</h2>
                    <div v-if="backgroundAssetKey" class="grid gap-2">
                        <span class="text-xs text-slate-400 font-mono">{{ NXTHEME_ASSET_FILENAMES[backgroundAssetKey] }}</span>
                        <div
                            class="group relative grid aspect-video max-w-[720px] cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-dashed border-slate-700/60 bg-slate-950/40 transition-all duration-300 hover:border-primary-400/80 hover:bg-slate-950/60"
                            :class="{ 'border-primary-400 ring-1 ring-primary-400 bg-slate-950/70': dragActive[backgroundAssetKey] }"
                            role="button"
                            tabindex="0"
                            @click="openAssetPicker(backgroundAssetKey)"
                            @keydown.enter.prevent="openAssetPicker(backgroundAssetKey)"
                            @dragenter.prevent="onAssetDragEnter(backgroundAssetKey)"
                            @dragover.prevent
                            @dragleave.prevent="onAssetDragLeave(backgroundAssetKey)"
                            @drop.prevent="onAssetDrop(backgroundAssetKey, $event)"
                        >
                            <img
                                v-if="previewUrls[backgroundAssetKey]"
                                :src="previewUrls[backgroundAssetKey]"
                                :alt="ASSET_DISPLAY_NAMES[backgroundAssetKey]"
                                class="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                            />
                            <div v-else class="flex flex-col items-center gap-2 p-4 text-center">
                                <span class="i-lucide-file-up text-3xl text-slate-500 transition-colors group-hover:text-primary-400" />
                                <span class="text-xs font-medium text-slate-300">Drag & drop background or click to upload</span>
                                <span class="text-[10px] text-slate-500">Supports JPG, PNG</span>
                            </div>
                        </div>
                        <p class="text-xs text-slate-400">
                            {{ ASSET_SIZING_RULES[backgroundAssetKey].width }}x{{ ASSET_SIZING_RULES[backgroundAssetKey].height }}
                            ({{ ASSET_SIZING_RULES[backgroundAssetKey].mimeType.split('/')[1].toUpperCase() }})
                        </p>
                        <div class="flex flex-wrap gap-2">
                            <n-button type="button" btn="soft"  leading="i-lucide-file-up" size="sm"
                                      @click="openAssetPicker(backgroundAssetKey)">Select
                            </n-button>
                            <input
                                :ref="(element) => setAssetInputRef(backgroundAssetKey!, element as HTMLInputElement | null)"
                                style="display: none"
                                type="file"
                                accept="image/*"
                                @change="onAssetSelected(backgroundAssetKey, $event)"
                            />
                            <n-button btn="soft-error" size="sm" :disabled="!form.assets[backgroundAssetKey]"
                                      leading="i-lucide-x-circle" @click="removeAsset(backgroundAssetKey)">Clear
                            </n-button>
                        </div>
                    </div>
                </article>

                <div class="flex items-center justify-center max-lg:order-2">
                    <n-badge badge="outline-warning" size="xs" class="px-2 uppercase tracking-wide">AND/OR</n-badge>
                </div>

                <article
                    class="grid h-full gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl max-lg:order-3">
                    <h2 class="text-lg font-semibold">Layouts</h2>
                    <div class="grid h-full gap-3">
                        <label class="grid h-full gap-1 text-sm">
                            <span class="text-xs text-slate-400">layout.json</span>
                            <div class="relative h-full min-h-40">
                                <textarea
                                    v-model="form.layoutJson"
                                    class="h-full w-full rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs font-mono text-slate-300 placeholder-slate-600 focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all duration-200 outline-none resize-none"
                                    placeholder="Paste layout JSON here. If set, background image is optional."
                                />
                                <button
                                    v-if="form.layoutJson.trim()"
                                    type="button"
                                    class="absolute right-2.5 top-2.5 rounded-lg bg-red-950/40 p-1 text-red-400 hover:bg-red-950/80 transition-colors border border-red-900/30"
                                    @click="clearLayoutJson"
                                >
                                    <span class="i-lucide-x text-xs block" />
                                </button>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <n-button size="sm" type="button" leading="i-lucide-file-up" btn="soft"
                                          @click="onSelectLayoutJson">Select
                                </n-button>
                            </div>
                            <input
                                ref="layoutJsonInput"
                                style="display: none"
                                type="file"
                                accept="application/json,.json,text/plain"
                                @change="onLayoutJsonSelected"
                            />
                        </label>

                        <label class="grid h-full gap-1 text-sm">
                            <span class="flex items-center justify-between gap-2 text-xs text-slate-400">
                                <span>common.json</span>
                                <n-badge badge="outline" size="xs" class="uppercase">optional</n-badge>
                            </span>
                            <div class="relative h-full min-h-40">
                                <textarea
                                    v-model="form.commonJson"
                                    class="h-full w-full rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs font-mono text-slate-300 placeholder-slate-600 focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all duration-200 outline-none resize-none"
                                    placeholder="Paste common JSON here."
                                />
                                <button
                                    v-if="form.commonJson.trim()"
                                    type="button"
                                    class="absolute right-2.5 top-2.5 rounded-lg bg-red-950/40 p-1 text-red-400 hover:bg-red-950/80 transition-colors border border-red-900/30"
                                    @click="clearCommonJson"
                                >
                                    <span class="i-lucide-x text-xs block" />
                                </button>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <n-button size="sm" type="button" leading="i-lucide-file-up" btn="soft"
                                          @click="onSelectCommonJson">Select
                                </n-button>
                            </div>
                            <input
                                ref="commonJsonInput"
                                style="display: none"
                                type="file"
                                accept="application/json,.json,text/plain"
                                @change="onCommonJsonSelected"
                            />
                        </label>
                    </div>
                </article>
            </section>

            <section v-if="iconAssetKeys.length > 0"
                     class="mb-4 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
                <h2 class="text-lg font-semibold">Icons</h2>
                <p class="text-sm text-slate-300">All icon assets are optional.</p>
                <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
                    <article v-for="key in iconAssetKeys" :key="key"
                             class="group relative flex flex-col gap-3 rounded-2xl border border-slate-800/60 bg-slate-950/20 hover:bg-slate-950/40 transition-all duration-300 p-3 shadow-sm">
                        <div class="flex items-start justify-between gap-2">
                            <div class="grid gap-0.5 min-w-0">
                                <strong class="text-xs font-semibold text-slate-200 truncate">{{ ASSET_DISPLAY_NAMES[key] }}</strong>
                                <span class="text-[10px] text-slate-500 font-mono truncate">{{ NXTHEME_ASSET_FILENAMES[key] }}</span>
                            </div>
                            <n-badge badge="outline" size="xs" class="uppercase">optional</n-badge>
                        </div>

                        <div
                            class="group/drop relative grid h-24 w-full cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-slate-800 bg-slate-950/30 transition-all duration-300 hover:border-primary-500/60 hover:bg-slate-950/50"
                            :class="{ 'border-primary-400 ring-1 ring-primary-400 bg-slate-950/60': dragActive[key] }"
                            role="button"
                            tabindex="0"
                            @click="openAssetPicker(key)"
                            @keydown.enter.prevent="openAssetPicker(key)"
                            @dragenter.prevent="onAssetDragEnter(key)"
                            @dragover.prevent
                            @dragleave.prevent="onAssetDragLeave(key)"
                            @drop.prevent="onAssetDrop(key, $event)"
                        >
                            <img
                                v-if="previewUrls[key]"
                                :src="previewUrls[key]"
                                :alt="ASSET_DISPLAY_NAMES[key]"
                                class="h-auto max-h-[64px] w-auto max-w-[64px] object-contain transition-transform duration-300 group-hover/drop:scale-105"
                            />
                            <img
                                v-else-if="ASSET_ICON_PRESETS[key]"
                                :src="presetIconUrl(key) || undefined"
                                :alt="ASSET_DISPLAY_NAMES[key]"
                                class="h-auto w-auto max-h-[56px] max-w-[56px] object-contain opacity-40 transition-opacity duration-300 group-hover/drop:opacity-60"
                            />
                            <span v-else class="text-[10px] text-slate-500 text-center">
                                <span class="i-lucide-file-up text-lg block mx-auto mb-1 text-slate-600 group-hover/drop:text-slate-400" />
                                No preview
                            </span>
                        </div>

                        <div class="flex items-center justify-between text-[9px] text-slate-500">
                            <span>{{ ASSET_SIZING_RULES[key].width }}x{{ ASSET_SIZING_RULES[key].height }}</span>
                            <span class="uppercase font-mono">{{ ASSET_SIZING_RULES[key].mimeType.split('/')[1] }}</span>
                        </div>

                        <div class="flex gap-2">
                            <n-button leading="i-lucide-file-up" size="xs" btn="soft" type="button" class="flex-1 justify-center" @click="openAssetPicker(key)">
                                Select
                            </n-button>
                            <input
                                :ref="(element) => setAssetInputRef(key, element as HTMLInputElement | null)"
                                style="display: none"
                                type="file"
                                accept="image/*"
                                @change="onAssetSelected(key, $event)"
                            />
                            <n-button icon size="xs" btn="soft-error" :disabled="!form.assets[key]"
                                      leading="i-lucide-x" class="px-2" @click="removeAsset(key)">
                            </n-button>
                        </div>
                    </article>
                </div>
            </section>

            <n-dialog
                v-if="cropAssetKey"
                :open="Boolean(cropAssetKey)"
                :una="{ dialogContent: 'w-[96vw] !max-w-[980px]' }"
                @update:open="(nextOpen) => { if (!nextOpen) closeCropEditor() }"
                title="Crop and Resize"
                description="Adjust framing before saving the resized asset"
            >
                <div class="grid w-full gap-3">
                    <p class="text-sm text-slate-300">
                        Editing <strong>{{ ASSET_DISPLAY_NAMES[cropAssetKey] }}</strong>
                        ({{ ASSET_SIZING_RULES[cropAssetKey].width }}x{{ ASSET_SIZING_RULES[cropAssetKey].height }})
                        from {{ cropFileName }}
                    </p>
                    <div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                        <div
                            v-if="cropEditorMetrics"
                            class="relative mx-auto w-full overflow-hidden select-none touch-none"
                            :style="{ width: `${cropEditorMetrics.displayWidth}px`, height: `${cropEditorMetrics.displayHeight}px` }"
                            @pointermove.prevent="onCropDragMove"
                            @pointerup="stopCropDrag"
                            @pointercancel="stopCropDrag"
                        >
                            <img
                                :src="cropSource"
                                alt="Crop source"
                                class="h-full w-full object-contain"
                                draggable="false"
                            />
                            <div
                                class="absolute cursor-move rounded border-2 border-primary-400 bg-primary-400/10"
                                :class="{ 'ring-2 ring-primary-300': cropDrag.active }"
                                :style="{
                                    left: `${cropEditorMetrics.frameLeft}px`,
                                    top: `${cropEditorMetrics.frameTop}px`,
                                    width: `${cropEditorMetrics.frameWidth}px`,
                                    height: `${cropEditorMetrics.frameHeight}px`,
                                    boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.55)',
                                }"
                                @pointerdown.prevent="startCropDrag"
                                @pointermove.prevent="onCropDragMove"
                                @pointerup="stopCropDrag"
                                @pointercancel="stopCropDrag"
                            >
                                <span class="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-primary-300" />
                                <span class="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary-300" />
                                <span class="absolute -bottom-1 -left-1 h-2 w-2 rounded-full bg-primary-300" />
                                <span class="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-primary-300" />
                            </div>
                        </div>
                    </div>
                    <label class="grid gap-1 text-sm">
                        Zoom
                        <input v-model.number="cropState.zoom" class="w-full" type="range" :min="cropState.minZoom"
                               max="4" step="0.01" />
                    </label>
                    <div class="flex justify-center rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                        <canvas ref="cropCanvas" class="max-w-[420px]" />
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <n-button leading="i-lucide-check" @click="applyCrop">Apply crop</n-button>
                        <n-button btn="soft" leading="i-lucide-x" @click="closeCropEditor">Cancel</n-button>
                    </div>
                </div>
            </n-dialog>

            <section class="grid gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
                <div class="flex flex-wrap justify-center gap-2">
                    <n-button :disabled="loading" :leading="loading ? 'i-lucide-loader-circle' : 'i-lucide-download'"
                               @click="onBuild">
                        {{ loading ? "Building..." : "Build and Download .nxtheme" }}
                    </n-button>
                    <n-button btn="soft" :disabled="loading" leading="i-lucide-file-up" @click="onImportClick">Import .nxtheme
                    </n-button>
                    <n-button btn="solid-error" :disabled="loading" leading="i-lucide-rotate-ccw" @click="onReset">
                        Reset
                    </n-button>
                </div>
                <input
                    ref="importInput"
                    style="display: none"
                    type="file"
                    accept=".nxtheme,application/octet-stream"
                    @change="onImportSelected"
                />
            </section>
        </div>
        <n-toaster />
    </main>
</template>


