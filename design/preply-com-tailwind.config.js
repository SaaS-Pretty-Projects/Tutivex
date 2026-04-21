/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
    colors: {
        primary: {
            '50': 'hsl(NaN, NaN%, 97%)',
            '100': 'hsl(NaN, NaN%, 94%)',
            '200': 'hsl(NaN, NaN%, 86%)',
            '300': 'hsl(NaN, NaN%, 76%)',
            '400': 'hsl(NaN, NaN%, 64%)',
            '500': 'hsl(NaN, NaN%, 50%)',
            '600': 'hsl(NaN, NaN%, 40%)',
            '700': 'hsl(NaN, NaN%, 32%)',
            '800': 'hsl(NaN, NaN%, 24%)',
            '900': 'hsl(NaN, NaN%, 16%)',
            '950': 'hsl(NaN, NaN%, 10%)',
            DEFAULT: '#ff7aac'
        },
        secondary: {
            '50': 'hsl(NaN, NaN%, 97%)',
            '100': 'hsl(NaN, NaN%, 94%)',
            '200': 'hsl(NaN, NaN%, 86%)',
            '300': 'hsl(NaN, NaN%, 76%)',
            '400': 'hsl(NaN, NaN%, 64%)',
            '500': 'hsl(NaN, NaN%, 50%)',
            '600': 'hsl(NaN, NaN%, 40%)',
            '700': 'hsl(NaN, NaN%, 32%)',
            '800': 'hsl(NaN, NaN%, 24%)',
            '900': 'hsl(NaN, NaN%, 16%)',
            '950': 'hsl(NaN, NaN%, 10%)',
            DEFAULT: '#121117'
        },
        accent: {
            '50': 'hsl(NaN, NaN%, 97%)',
            '100': 'hsl(NaN, NaN%, 94%)',
            '200': 'hsl(NaN, NaN%, 86%)',
            '300': 'hsl(NaN, NaN%, 76%)',
            '400': 'hsl(NaN, NaN%, 64%)',
            '500': 'hsl(NaN, NaN%, 50%)',
            '600': 'hsl(NaN, NaN%, 40%)',
            '700': 'hsl(NaN, NaN%, 32%)',
            '800': 'hsl(NaN, NaN%, 24%)',
            '900': 'hsl(NaN, NaN%, 16%)',
            '950': 'hsl(NaN, NaN%, 10%)',
            DEFAULT: '#99c5ff'
        },
        'neutral-50': '#ffffff',
        'neutral-100': '#384047',
        'neutral-200': '#4d4c5c',
        'neutral-300': '#dcdce5',
        'neutral-400': '#000000',
        'neutral-500': '#808080',
        'neutral-600': '#6a697c',
        background: '#141414',
        foreground: '#384047'
    },
    fontFamily: {
        body: [
            'Arial',
            'sans-serif'
        ],
        font2: [
            'Platform',
            'sans-serif'
        ]
    },
    fontSize: {
        '0': [
            '0px',
            {
                lineHeight: 'normal'
            }
        ],
        '14': [
            '14px',
            {
                lineHeight: 'normal'
            }
        ],
        '16': [
            '16px',
            {
                lineHeight: '24px'
            }
        ],
        '18': [
            '18px',
            {
                lineHeight: '24px',
                letterSpacing: '0.09px'
            }
        ],
        '20': [
            '20px',
            {
                lineHeight: '28px',
                letterSpacing: '-0.1px'
            }
        ],
        '24': [
            '24px',
            {
                lineHeight: '32px',
                letterSpacing: '0.3px'
            }
        ],
        '32': [
            '32px',
            {
                lineHeight: '36px',
                letterSpacing: '0.32px'
            }
        ],
        '48': [
            '48px',
            {
                lineHeight: '52px'
            }
        ],
        '64': [
            '64px',
            {
                lineHeight: '68px',
                letterSpacing: '-0.32px'
            }
        ],
        '96': [
            '96px',
            {
                lineHeight: '96px',
                letterSpacing: '-0.48px'
            }
        ],
        '13.3333': [
            '13.3333px',
            {
                lineHeight: 'normal'
            }
        ]
    },
    spacing: {
        '1': '2px',
        '12': '24px',
        '24': '48px',
        '30': '60px',
        '48': '96px',
        '80': '160px',
        '69px': '69px'
    },
    borderRadius: {
        xs: '2px',
        md: '8px',
        lg: '16px'
    },
    boxShadow: {
        sm: 'rgba(9, 15, 25, 0.1) 0px 0px 8px 0px',
        xl: 'rgba(0, 0, 0, 0.3) 0px 32px 68px 0px'
    },
    screens: {
        '880px': '880px',
        '1200px': '1200px',
        '1900px': '1900px'
    },
    transitionDuration: {
        '100': '0.1s',
        '200': '0.2s',
        '220': '0.22s',
        '300': '0.3s',
        '400': '0.4s',
        '500': '0.5s',
        '600': '0.6s',
        '900': '0.9s'
    },
    transitionTimingFunction: {
        custom: 'cubic-bezier(0.22, 1, 0.36, 1)',
        default: 'ease'
    },
    container: {
        center: true,
        padding: '96px'
    },
    maxWidth: {
        container: '1440px'
    }
},
  },
};
