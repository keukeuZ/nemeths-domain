/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'medieval': ['Cinzel', 'serif'],
        'body': ['Crimson Text', 'serif'],
      },
      colors: {
        // Medieval parchment palette (10 shades)
        'parchment': {
          50: '#FAF7F2',
          100: '#F5EBE0',
          200: '#EBD9C4',
          300: '#DFC5A5',
          400: '#D2AE85',
          500: '#C49A6C',
          600: '#A67C52',
          700: '#7D5A3C',
          800: '#533A27',
          900: '#2A1D13',
          950: '#1A1510',
        },
        // Gold accents (ornate)
        'gold': {
          50: '#FDF9E8',
          100: '#FCEFC0',
          200: '#F9E083',
          300: '#F5CE47',
          400: '#EEBA1D',
          500: '#D4AF37', // Primary gold
          600: '#B8941C',
          700: '#8C6F16',
          800: '#5F4A10',
          900: '#332607',
        },
        // Bronze accents (secondary)
        'bronze': {
          50: '#FBF5EC',
          100: '#F5E6D1',
          200: '#EAC9A0',
          300: '#DDA96A',
          400: '#CD7F32', // Primary bronze
          500: '#B26A25',
          600: '#8C521C',
          700: '#663C15',
          800: '#40260D',
          900: '#1A0F05',
        },
        // Medieval dark backgrounds
        'medieval': {
          50: '#E8E5E1',
          100: '#CFC9C1',
          200: '#9E958A',
          300: '#6E6358',
          400: '#4D4438',
          500: '#3D3328',
          600: '#2D251C',
          700: '#1E1914',
          800: '#14110D',
          900: '#0D0A07',
          950: '#080604',
        },
        // Game-specific colors
        'nemeths': {
          'primary': '#8B5CF6',
          'secondary': '#6366F1',
          'accent': '#F59E0B',
        },
        // Race colors (updated for medieval palette)
        'race': {
          'ironveld': '#8B8178',    // Stone/earth
          'vaelthir': '#8B1538',    // Dark blood red
          'korrath': '#B22222',     // Firebrick
          'sylvaeth': '#2D5A3D',    // Forest green
          'ashborn': '#5A5A5A',     // Ash gray
          'breathborn': '#4A7B8C',  // Deep teal
        },
        // Zone colors (for map)
        'zone': {
          'outer': '#4A6741',       // Forest green
          'middle': '#6B5C4A',      // Brown
          'inner': '#8B4513',       // Saddle brown
          'heart': '#4A1A1A',       // Dark crimson
        },
      },
      backgroundImage: {
        'parchment-texture': "url('/textures/parchment.png')",
        'leather-texture': "url('/textures/leather.png')",
        'stone-texture': "url('/textures/stone.png')",
      },
      boxShadow: {
        'medieval': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        'medieval-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
        'ornate': '0 0 0 2px rgba(212, 175, 55, 0.3), 0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        'glow-gold': '0 0 15px rgba(212, 175, 55, 0.5)',
        'glow-gold-sm': '0 0 8px rgba(212, 175, 55, 0.4)',
        'inner-shadow': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
      },
      borderRadius: {
        'medieval': '0.25rem',
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
        'bounce-subtle': 'bounce-subtle 0.5s ease-out',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(212, 175, 55, 0.4)' },
          '50%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.7)' },
        },
        'glow': {
          '0%': { opacity: '0.5' },
          '100%': { opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
    },
  },
  plugins: [],
};
