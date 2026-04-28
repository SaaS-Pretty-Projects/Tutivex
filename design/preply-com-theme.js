// React Theme — extracted from https://preply.com
// Compatible with: Chakra UI, Stitches, Vanilla Extract, or any CSS-in-JS

/**
 * TypeScript type definition for this theme:
 *
 * interface Theme {
 *   colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    neutral50: string;
    neutral100: string;
    neutral200: string;
    neutral300: string;
    neutral400: string;
    neutral500: string;
    neutral600: string;
 *   };
 *   fonts: {
    body: string;
 *   };
 *   fontSizes: {
    '0': string;
    '14': string;
    '16': string;
    '18': string;
    '20': string;
    '24': string;
    '32': string;
    '48': string;
    '64': string;
    '96': string;
    '13.3333': string;
 *   };
 *   space: {
    '2': string;
    '24': string;
    '48': string;
    '60': string;
    '69': string;
    '96': string;
    '160': string;
 *   };
 *   radii: {
    xs: string;
    md: string;
    lg: string;
 *   };
 *   shadows: {
    sm: string;
    xl: string;
 *   };
 *   states: {
 *     hover: { opacity: number };
 *     focus: { opacity: number };
 *     active: { opacity: number };
 *     disabled: { opacity: number };
 *   };
 * }
 */

export const theme = {
  "colors": {
    "primary": "#ff7aac",
    "secondary": "#121117",
    "accent": "#99c5ff",
    "background": "#141414",
    "foreground": "#384047",
    "neutral50": "#ffffff",
    "neutral100": "#384047",
    "neutral200": "#4d4c5c",
    "neutral300": "#dcdce5",
    "neutral400": "#000000",
    "neutral500": "#808080",
    "neutral600": "#6a697c"
  },
  "fonts": {
    "body": "'Arial', sans-serif"
  },
  "fontSizes": {
    "0": "0px",
    "14": "14px",
    "16": "16px",
    "18": "18px",
    "20": "20px",
    "24": "24px",
    "32": "32px",
    "48": "48px",
    "64": "64px",
    "96": "96px",
    "13.3333": "13.3333px"
  },
  "space": {
    "2": "2px",
    "24": "24px",
    "48": "48px",
    "60": "60px",
    "69": "69px",
    "96": "96px",
    "160": "160px"
  },
  "radii": {
    "xs": "2px",
    "md": "8px",
    "lg": "16px"
  },
  "shadows": {
    "sm": "rgba(9, 15, 25, 0.1) 0px 0px 8px 0px",
    "xl": "rgba(0, 0, 0, 0.3) 0px 32px 68px 0px"
  },
  "states": {
    "hover": {
      "opacity": 0.08
    },
    "focus": {
      "opacity": 0.12
    },
    "active": {
      "opacity": 0.16
    },
    "disabled": {
      "opacity": 0.38
    }
  }
};

// MUI v5 theme
export const muiTheme = {
  "palette": {
    "primary": {
      "main": "#ff7aac",
      "light": "hsl(337, 100%, 89%)",
      "dark": "hsl(337, 100%, 59%)"
    },
    "secondary": {
      "main": "#121117",
      "light": "hsl(250, 15%, 23%)",
      "dark": "hsl(250, 15%, 10%)"
    },
    "background": {
      "default": "#141414",
      "paper": "#ff7aac"
    },
    "text": {
      "primary": "#384047",
      "secondary": "#121117"
    }
  },
  "typography": {
    "fontFamily": "'Figtree', sans-serif",
    "h1": {
      "fontSize": "32px",
      "fontWeight": "700",
      "lineHeight": "36px"
    },
    "h2": {
      "fontSize": "24px",
      "fontWeight": "700",
      "lineHeight": "32px"
    },
    "h3": {
      "fontSize": "20px",
      "fontWeight": "400",
      "lineHeight": "28px"
    }
  },
  "shape": {
    "borderRadius": 8
  },
  "shadows": [
    "rgba(9, 15, 25, 0.1) 0px 0px 8px 0px",
    "rgba(0, 0, 0, 0.3) 0px 32px 68px 0px"
  ]
};

export default theme;
