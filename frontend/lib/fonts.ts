/**
 * Self-hosted fonts (plan §6.J) — Vazirmatn + Poppins via next/font/local.
 *
 * The woff2 files live in frontend/fonts/ and are bundled by Next at build
 * time (hashed under /_next/static/media/), so there is zero runtime
 * dependency on fonts.googleapis.com — which is blocked for the site's
 * primary audience in Iran and unreachable from the production build host
 * (the reason next/font/google is forbidden here).
 *
 * Vazirmatn: from the upstream repo (rastikerdar/vazirmatn, OFL),
 * fonts/webfonts/*.woff2, weights 400–900.
 * Poppins: latin subset woff2 (same files Google Fonts serves), weights
 * 500–800, used for latin brand/model text via the `font-poppins` utility.
 */
import localFont from 'next/font/local'

export const vazirmatn = localFont({
  src: [
    { path: '../fonts/vazirmatn/Vazirmatn-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/vazirmatn/Vazirmatn-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/vazirmatn/Vazirmatn-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/vazirmatn/Vazirmatn-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../fonts/vazirmatn/Vazirmatn-ExtraBold.woff2', weight: '800', style: 'normal' },
    { path: '../fonts/vazirmatn/Vazirmatn-Black.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-vazirmatn',
  display: 'swap',
})

export const poppins = localFont({
  src: [
    { path: '../fonts/poppins/poppins-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/poppins/poppins-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/poppins/poppins-latin-700-normal.woff2', weight: '700', style: 'normal' },
    { path: '../fonts/poppins/poppins-latin-800-normal.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-poppins',
  display: 'swap',
})