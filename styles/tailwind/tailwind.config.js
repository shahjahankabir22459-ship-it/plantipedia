/**
 * Plantipedia Zero-Build Tailwind CSS Play CDN Configuration
 * Preserves existing stylesheet cascade by disabling Preflight while exposing
 * Dark Botanical Luxury color, font, blur, shadow, and breakpoint tokens.
 */
window.tailwind = window.tailwind || {};
window.tailwind.config = {
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        "botanical-dark": "#04140c",
        "botanical-surface": "#071f13",
        "botanical-footer": "#030f09",
        "emerald-accent": "#10b981",
        "mint-luminous": "#4ade80",
        "mint-bright": "#6ee7b7",
        "gold-botanical": "#fbbf24",
        "gold-soft": "#fde68a",
        "ink-primary": "#f3f7f4",
        "ink-secondary": "#b8ccc0",
        "ink-muted": "#8aa596",
      },
      fontFamily: {
        display: ['"Playfair Display"', "Georgia", "serif"],
        sans: ['"Plus Jakarta Sans"', "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      backdropBlur: {
        glass: "16px",
        heavy: "20px",
      },
      boxShadow: {
        glass: "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 14px 36px rgba(0, 0, 0, 0.34)",
        "glass-hover":
          "inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 22px 44px -14px rgba(16, 185, 129, 0.32)",
      },
      screens: {
        xs: "480px",
        "4k": "1800px",
      },
    },
  },
};
