/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        'typing': {
          '0%, 80%, 100%': { transform: 'scale(0)', opacity: '0.3' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        }
    },
    animation: {
        'typing-dot-1': 'typing 1.4s infinite ease-in-out',
        'typing-dot-2': 'typing 1.4s infinite ease-in-out 0.2s',
        'typing-dot-3': 'typing 1.4s infinite ease-in-out 0.4s',
      }
    }
  },
  plugins: [],
}

