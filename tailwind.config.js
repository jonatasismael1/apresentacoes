/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dbe: {
          blue: '#0090D0',
          green: '#4BB65B',
          navy: '#235183',
          deepGreen: '#008743',
          dark: '#000000',
          darker: '#0A0A0A',
          gray: '#1F1F1F',
          lightGray: '#F5F5F5',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Montserrat', 'sans-serif'], // Usando Montserrat como alternativa ao Loos Wide
      },
    },
  },
  plugins: [],
}

