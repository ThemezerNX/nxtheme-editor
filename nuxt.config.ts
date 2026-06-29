import { defineNuxtConfig } from "nuxt/config"

export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  ssr: false,
  modules: ["@nuxt/icon", "@unocss/nuxt", "@una-ui/nuxt"],
  una: {
    prefix: "N",
    themeable: true,
    global: true,
  },
  devtools: {
    enabled: false,
  },
  app: {
    head: {
      title: "NXTheme Builder",
      meta: [
        {
          name: "description",
          content: "Standalone NXTheme builder for Nintendo Switch .nxtheme files",
        },
      ],
    },
  },
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ["/"],
    },
  },
})

