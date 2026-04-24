/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Heebo', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          coral:  '#FF9B7A',
          purple: '#C4A7E7',
          yellow: '#FFD166',
          teal:   '#7DD3B0',
          sky:    '#8FC0E8',
          pink:   '#F5A8D6',
          navy:   '#2D3047',
          cream:  '#FFF7F0',
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
