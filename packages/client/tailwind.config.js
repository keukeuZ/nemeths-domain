/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Game-specific colors
        'nemeths': {
          'primary': '#8B5CF6',
          'secondary': '#6366F1',
          'accent': '#F59E0B',
        },
        // Race colors
        'race': {
          'ironveld': '#78716C',
          'vaelthir': '#DC2626',
          'korrath': '#991B1B',
          'sylvaeth': '#059669',
          'ashborn': '#6B7280',
          'breathborn': '#0EA5E9',
        },
      },
    },
  },
  plugins: [],
};
