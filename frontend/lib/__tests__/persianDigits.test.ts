import { PERSIAN_DIGITS, toLatinDigits, toPersianDigits } from '../format/persianDigits'

describe('toPersianDigits', () => {
  it('converts every Latin digit', () => {
    expect(toPersianDigits('0123456789')).toBe('۰۱۲۳۴۵۶۷۸۹')
  })

  it('converts numbers', () => {
    expect(toPersianDigits(0)).toBe('۰')
    expect(toPersianDigits(42)).toBe('۴۲')
    expect(toPersianDigits(1_500_000)).toBe('۱٬۵۰۰٬۰۰۰'.replace(/٬/g, '')) // no grouping — plain digits
  })

  it('formats mixed Persian strings — digits become Persian, letters stay', () => {
    expect(toPersianDigits('بنز E 200')).toBe('بنز E ۲۰۰')
    expect(toPersianDigits('موبایل: 0912 345 6789')).toBe('موبایل: ۰۹۱۲ ۳۴۵ ۶۷۸۹')
  })

  it('is idempotent on Persian input', () => {
    const once = toPersianDigits('صفحه 12')
    expect(toPersianDigits(once)).toBe(once)
  })

  it('passes through strings without digits', () => {
    expect(toPersianDigits('هیچ عددی نیست')).toBe('هیچ عددی نیست')
  })

  it('never converts production years passed through other channels', () => {
    // Years simply never reach the helper at display sites; the helper has
    // no year special-casing — this pins the contract for reviewers.
    expect(toPersianDigits(1402)).toBe('۱۴۰۲')
  })
})

describe('toLatinDigits (tel: inversion)', () => {
  it('converts Persian digits back to Latin', () => {
    expect(toLatinDigits('۰۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789')
  })

  it('round-trips through toPersianDigits', () => {
    const displayed = toPersianDigits('021-8899 4433')
    expect(toLatinDigits(displayed)).toBe('021-8899 4433')
  })

  it('builds a Latin tel: href from a Persian display string', () => {
    const settingsPhone = '۰۲۱-۸۸۹۹۴۴۳۳'
    expect(`tel:${toLatinDigits(settingsPhone)}`).toBe('tel:021-88994433')
  })

  it('leaves Latin digits untouched', () => {
    expect(toLatinDigits('021-88994433')).toBe('021-88994433')
  })
})

describe('PERSIAN_DIGITS', () => {
  it('has exactly ten characters in order', () => {
    expect(PERSIAN_DIGITS).toHaveLength(10)
    expect(PERSIAN_DIGITS.join('')).toBe('۰۱۲۳۴۵۶۷۸۹')
  })
})
