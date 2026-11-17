/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette (spec Section 10). No Tailwind blue/gray defaults anywhere.
        granate: { DEFAULT: '#7A1F2B', dark: '#5C1520', light: '#A8505C' },
        sage: { DEFAULT: '#8A9A7B', dark: '#5E6E52', light: '#E6EBE1' },
        canvas: '#F7F5F2',
        ink: '#1F1D1B',
        warmgrey: '#6B6560',
        // Semantic tokens, re-pointed per theme in index.css
        surface: 'var(--surface)',
        'surface-alt': 'var(--surface-alt)',
        body: 'var(--body)',
        'text-main': 'var(--text-main)',
        'text-muted': 'var(--text-muted)',
        'text-meta': 'var(--text-meta)',
        action: 'var(--action)',
        'action-hover': 'var(--action-hover)',
        'action-fg': 'var(--action-fg)',
        line: 'var(--line)',
        accent: 'var(--accent)',
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { brand: '7px' },
      fontSize: { base: ['17px', '1.6'] },
      maxWidth: { prose: '70ch' },
    },
  },
  plugins: [],
}
