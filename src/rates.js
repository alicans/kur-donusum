// Kur verisinin alınması (Frankfurter API) ve localStorage cache'i.
import { BASE_CURRENCY, CURRENCY_CODES, GOLD_API_CODE, GOLD_CODE, GRAMS_PER_TROY_OUNCE } from './currencies.js'

const API_URL = 'https://api.frankfurter.dev/v2/rates'
const STORAGE_KEY = 'kur:rates:v3'
const FETCH_TIMEOUT_MS = 10_000

const DIRECT_QUOTES = CURRENCY_CODES.filter((code) => code !== BASE_CURRENCY && code !== GOLD_CODE)

/**
 * Snapshot biçimi:
 * { rates: { EUR: 1, TRY: 55.63, ... }, rateDate: '2026-10-20', fetchedAt: 1760968500000 }
 * rates[code] = 1 BASE_CURRENCY karşılığı; GOLD için 1 EUR'nun kaç gram altın ettiği.
 */

function isValidRates(rates) {
  return CURRENCY_CODES.every((code) => Number.isFinite(rates?.[code]) && rates[code] > 0)
}

function isValidSnapshot(snapshot) {
  return isValidRates(snapshot?.rates) && Number.isFinite(snapshot.fetchedAt)
}

async function requestRates(base, quotes) {
  const params = new URLSearchParams({ base, quotes: quotes.join(',') })
  const response = await fetch(`${API_URL}?${params}`, {
    // HTTP cache'i yeniden doğrulat; "Güncel" etiketi gerçekten güncel veriyi göstersin.
    cache: 'no-cache',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`Frankfurter API HTTP ${response.status}`)
  }

  const data = await response.json()
  if (!Array.isArray(data)) {
    throw new Error('Frankfurter API beklenmeyen yanıt döndürdü')
  }
  return data
}

export async function fetchRates() {
  // Frankfurter XAU'yu EUR bazında yalnızca 2 anlamlı basamakla döndürüyor (0.00027).
  // Bu yüzden XAU kendi bazında sorgulanır: 1 ons = 3702.79 EUR.
  const [direct, gold] = await Promise.all([
    requestRates(BASE_CURRENCY, DIRECT_QUOTES),
    requestRates(GOLD_API_CODE, [BASE_CURRENCY]),
  ])

  const rates = { [BASE_CURRENCY]: 1 }
  let rateDate = null
  for (const { quote, rate, date } of direct) {
    if (!DIRECT_QUOTES.includes(quote)) continue
    rates[quote] = rate
    if (!rateDate || date > rateDate) rateDate = date
  }

  const ounce = gold.find(({ base, quote }) => base === GOLD_API_CODE && quote === BASE_CURRENCY)
  if (ounce) {
    // 1 EUR = 31.1034768 / (1 ons EUR fiyatı) gram altın. Yuvarlama yapılmaz.
    rates[GOLD_CODE] = GRAMS_PER_TROY_OUNCE / ounce.rate
    if (!rateDate || ounce.date > rateDate) rateDate = ounce.date
  }

  if (!isValidRates(rates)) {
    const missing = CURRENCY_CODES.filter((code) => !(rates[code] > 0 && Number.isFinite(rates[code])))
    throw new Error(`Frankfurter API yanıtında eksik/geçersiz kur: ${missing.join(', ')}`)
  }

  return { rates, rateDate, fetchedAt: Date.now() }
}

export function loadCachedRates() {
  try {
    const snapshot = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (snapshot === null) return null
    if (isValidSnapshot(snapshot)) return snapshot
    console.warn('[kur] localStorage kur cache verisi geçersiz, yok sayılıyor')
  } catch (error) {
    console.warn('[kur] localStorage kur cache verisi okunamadı:', error)
  }
  return null
}

export function saveRates(snapshot) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch (error) {
    console.warn('[kur] Kurlar localStorage\'a yazılamadı:', error)
  }
}
