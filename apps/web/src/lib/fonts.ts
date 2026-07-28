/**
 * Keep the public font variables stable without making production builds
 * depend on Google Fonts being reachable. Visitors still get Manrope/Noto
 * Serif SC when those fonts are installed, followed by the existing
 * platform-font fallbacks from tailwindcss.css.
 */
const sansFont = { variable: 'font-shiro-sans' } as const
const serifFont = { variable: 'font-shiro-serif' } as const

export { sansFont, serifFont }
