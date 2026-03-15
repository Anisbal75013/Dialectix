/** @type {import('tailwindcss').Config} */
export default {
  // Scan tous les fichiers JSX/JS pour purger les classes inutilisées en prod
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],

  // Étend le thème avec les CSS variables Dialectix pour cohérence totale
  theme: {
    extend: {
      colors: {
        // Palette Dialectix — mappée sur les CSS variables existantes
        dx: {
          bg:     '#F6F1E8',
          txt:    '#1A1A1A',
          dim:    '#5C4F38',
          muted:  '#8A7860',
          bd:     '#D4C8A8',
          A:      '#2C4A6E',   // bleu — joueur A / accent principal
          B:      '#8C3A30',   // rouge — joueur B
          G:      '#3A6E52',   // vert — victoire / succès
          Y:      '#C6A15B',   // or — ELO / badges
          O:      '#A05A2C',   // orange — alertes / hot
          P:      '#5A3A6E',   // violet — arena
        },
      },
      fontFamily: {
        heading: ['Cinzel', 'serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        body:    ['Inter', 'sans-serif'],
      },
      // Breakpoints alignés sur l'existant
      screens: {
        'xs': '375px',   // petit mobile
        'sm': '640px',   // mobile large / petite tablette
        'md': '768px',   // tablette
        'lg': '1024px',  // laptop
        'xl': '1280px',  // desktop
        '2xl': '1536px', // grand écran
      },
      // Touch targets minimum (WCAG 2.5.5)
      minHeight: {
        'touch': '44px',
        'touch-lg': '48px',
      },
      minWidth: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
};
