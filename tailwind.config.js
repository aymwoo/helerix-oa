/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './views/**/*.{js,ts,jsx,tsx,mdx}',
    './*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#8B5CF6',
        secondary: '#F97316',
        'surface-light': '#FFFFFF',
        'background-light': '#F5F7FA', // Updated per Spec
        'border-light': '#E5E7EB',     // Updated per Spec
        'text-main': '#1F2937',        // Updated per Spec (text_primary)
        'text-muted': '#6B7280',       // Updated per Spec (text_secondary)
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
