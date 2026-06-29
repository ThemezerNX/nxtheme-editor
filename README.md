# nxtheme-editor

A modern, standalone web-based editor for Nintendo Switch custom home menu themes (`.nxtheme` files). 

This editor is built using **Nuxt 4**, **Una UI**, **UnoCSS**, and is powered by the **[@themezernx/nxtheme-builder](https://www.npmjs.com/package/@themezernx/nxtheme-builder)** package.

## Features

- **Visual Theme Editing**: Edit layouts, backgrounds, colors, and metadata for custom home menu themes.
- **Modern UI Components**: Sleek interface built with Una UI component library.
- **Fast Building**: Responsive development experience using Vite and UnoCSS.
- **Zero-Dependency Core Parsing**: Theme files compiled and parsed on top of `@themezernx/nxtheme-builder`.

## Getting Started

### Prerequisites

Make sure you have Node.js (version 24.x) and `pnpm` installed on your machine.

### Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/ThemezerNX/nxtheme-editor
pnpm install
```

### Development Server

Start the local development server with hot module replacement (HMR):

```bash
pnpm start:dev
```

Open your browser and navigate to the local URL (usually `http://localhost:3000`).

### Production Build

To compile a highly optimized production bundle:

```bash
pnpm run build
```

To preview the built production app locally:

```bash
pnpm run start
```

## License

This project is licensed under the **GNU General Public License v3 (GPL-3.0)** - see the [LICENSE](LICENSE) file for details.
