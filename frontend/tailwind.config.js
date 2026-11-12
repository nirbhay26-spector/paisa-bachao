/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        primary: 'var(--color-primary)',
        accent: 'var(--color-accent)',
        highlight: 'var(--color-highlight)',
        text: 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        expense: 'var(--color-expense)',
        income: 'var(--color-income)',
        border: 'var(--color-border)',
      },
      fontFamily: {
        heading: ['"Space Grotesk"', '"Sora"', 'sans-serif'],
        sans: ['"DM Sans"', '"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        sticker: '3px 3px 0px var(--color-border)',
        'sticker-lg': '5px 5px 0px var(--color-border)',
        'sticker-hover': '1px 1px 0px var(--color-border)',
      },
      borderRadius: {
        card: '22px',
        sticker: '16px',
      },
    },
  },
  plugins: [],
};
