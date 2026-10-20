// Girdi ayrıştırma, dönüşüm ve ekran formatı. Hesaplar tam precision ile yapılır;
// yuvarlama yalnızca formatlama aşamasında olur.

const LOCALE = 'tr-TR'
const MAX_INPUT_LENGTH = 18
// 1'den küçük değerlerde kaç anlamlı basamak gösterileceği (0,01798 gibi).
const SMALL_VALUE_SIGNIFICANT_DIGITS = 4
const CENTS = 100

function createFormatters(useGrouping) {
  return {
    whole: new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0, useGrouping }),
    cents: new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping }),
    small: new Intl.NumberFormat(LOCALE, { maximumSignificantDigits: SMALL_VALUE_SIGNIFICANT_DIGITS, useGrouping }),
  }
}

const DISPLAY = createFormatters(true)
const EDITABLE = createFormatters(false)

function format(value, formatters) {
  if (value === 0) return formatters.whole.format(0)
  if (Math.abs(value) < 1) return formatters.small.format(value)
  const isWholeAtCents = Math.round(value * CENTS) % CENTS === 0
  return (isWholeAtCents ? formatters.whole : formatters.cents).format(value)
}

/** Ekranda gösterilecek değer: 1.234,56 */
export function formatAmount(value) {
  return format(value, DISPLAY)
}

/** Kullanıcı bir satıra geçtiğinde düzenlenebilir değer: 1234,56 (binlik ayırıcı yok) */
export function toEditableString(value) {
  return format(value, EDITABLE)
}

/** Rakam, nokta ve virgül dışındaki her şeyi atar (eksi işareti dahil). */
export function sanitizeInput(value) {
  return value.replace(/[^\d.,]/g, '').slice(0, MAX_INPUT_LENGTH)
}

/**
 * "1234,56", "1234.56", "1.234,56", "1,234.56", "1.000.000" gibi girdileri sayıya çevirir.
 * - Hem nokta hem virgül varsa: en sondaki ondalık ayırıcı, diğerleri binlik.
 * - Tek tür ayırıcı birden çok kez geçiyorsa: hepsi binlik.
 * - Tek ayırıcı tek kez geçiyorsa: ondalık.
 * Geçersiz/boş girdide null döner.
 */
export function parseAmount(raw) {
  const text = raw.replace(/\s/g, '')
  if (!/^[\d.,]*\d[\d.,]*$/.test(text)) return null

  const lastSeparator = Math.max(text.lastIndexOf('.'), text.lastIndexOf(','))
  let normalized = text
  if (lastSeparator !== -1) {
    const separator = text[lastSeparator]
    const isMixed = text.includes('.') && text.includes(',')
    const separatorCount = text.split(separator).length - 1
    normalized =
      !isMixed && separatorCount > 1
        ? text.replace(/[.,]/g, '')
        : `${text.slice(0, lastSeparator).replace(/[.,]/g, '')}.${text.slice(lastSeparator + 1)}`
  }

  const value = Number(normalized)
  return Number.isFinite(value) && value >= 0 ? value : null
}

/** rates[code] = 1 baz para birimi karşılığı; çapraz kur baz üzerinden hesaplanır. */
export function convert(amount, fromCode, toCode, rates) {
  if (fromCode === toCode) return amount
  return (amount / rates[fromCode]) * rates[toCode]
}
