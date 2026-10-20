// Desteklenen para birimleri; ekrandaki sıra bu listedeki sıradır.
export const CURRENCIES = [
  { code: 'TRY', name: 'Türk Lirası' },
  { code: 'MKD', name: 'Makedon Dinarı' },
  { code: 'EUR', name: 'Euro' },
  { code: 'USD', name: 'Amerikan Doları' },
  { code: 'GBP', name: 'İngiliz Sterlini' },
  { code: 'GOLD', name: 'Gram Altın' },
]

export const CURRENCY_CODES = CURRENCIES.map((currency) => currency.code)

// Tüm kurlar bu para birimine göre saklanır (1 EUR = x).
export const BASE_CURRENCY = 'EUR'

// GOLD = gram altın. API'de karşılığı XAU (troy ons) fiyatıdır; gram'a bu sabitle çevrilir.
export const GOLD_CODE = 'GOLD'
export const GOLD_API_CODE = 'XAU'
export const GRAMS_PER_TROY_OUNCE = 31.1034768

export const DEFAULT_SOURCE_CODE = 'TRY'
export const DEFAULT_SOURCE_AMOUNT = '1000'
