import { useCallback, useEffect, useRef, useState } from 'react'
import CurrencyIcon from './CurrencyIcon.jsx'
import { CURRENCIES, DEFAULT_SOURCE_AMOUNT, DEFAULT_SOURCE_CODE } from './currencies.js'
import { convert, formatAmount, parseAmount, sanitizeInput, toEditableString } from './convert.js'
import { fetchRates, loadCachedRates, saveRates } from './rates.js'

const LOCALE = 'tr-TR'
const CLOCK_TICK_MS = 30_000
// Uygulama arka plandan döndüğünde kur bundan eskiyse yeniden çekilir.
const AUTO_REFRESH_AFTER_MS = 60 * 60 * 1000
// Bu karakter sayısını aşan değerlerde satır fontu küçülür (dar ekranda taşmasın).
const LONG_VALUE_CHARS = 8
const XLONG_VALUE_CHARS = 11
const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

const timeFormat = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })
const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const relativeFormat = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })

function formatClock(timestamp, now) {
  const isToday = new Date(timestamp).toDateString() === new Date(now).toDateString()
  return (isToday ? timeFormat : dateTimeFormat).format(timestamp)
}

function formatAgo(timestamp, now) {
  const elapsed = Math.max(0, now - timestamp)
  if (elapsed < MINUTE_MS) return 'az önce'
  if (elapsed < HOUR_MS) return relativeFormat.format(-Math.floor(elapsed / MINUTE_MS), 'minute')
  if (elapsed < DAY_MS) return relativeFormat.format(-Math.floor(elapsed / HOUR_MS), 'hour')
  return relativeFormat.format(-Math.floor(elapsed / DAY_MS), 'day')
}

function selectAll(input) {
  input.setSelectionRange(0, input.value.length)
}

function getInputSizeClass(value) {
  if (value.length > XLONG_VALUE_CHARS) return ' is-xlong'
  if (value.length > LONG_VALUE_CHARS) return ' is-long'
  return ''
}

function getStatusView(status, snapshot, now) {
  switch (status) {
    case 'fresh':
      return { tone: 'fresh', label: `Güncel · ${formatClock(snapshot.fetchedAt, now)}` }
    case 'stale':
      return { tone: 'stale', label: `Eski kur · ${formatAgo(snapshot.fetchedAt, now)}` }
    case 'error':
      return { tone: 'error', label: 'Kur alınamadı' }
    default:
      return { tone: 'loading', label: snapshot ? 'Güncelleniyor…' : 'Kurlar alınıyor…' }
  }
}

export default function App() {
  const [snapshot, setSnapshot] = useState(loadCachedRates)
  // 'loading' | 'fresh' | 'stale' | 'error'
  const [status, setStatus] = useState('loading')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [source, setSource] = useState(() => ({
    code: DEFAULT_SOURCE_CODE,
    raw: DEFAULT_SOURCE_AMOUNT,
    amount: parseAmount(DEFAULT_SOURCE_AMOUNT),
  }))
  const [focusedCode, setFocusedCode] = useState(null)
  const [now, setNow] = useState(Date.now)
  const inFlightRef = useRef(null)
  const justFocusedRef = useRef(false)

  const rates = snapshot?.rates ?? null

  // Aynı anda tek istek: devam eden istek varsa yenisi açılmaz.
  const refresh = useCallback(() => {
    if (inFlightRef.current) return inFlightRef.current

    setIsRefreshing(true)
    inFlightRef.current = fetchRates()
      .then((next) => {
        saveRates(next)
        setSnapshot(next)
        setStatus('fresh')
      })
      .catch((error) => {
        console.error('[kur] Kurlar alınamadı:', error)
        const cached = loadCachedRates()
        if (cached) {
          console.warn(`[kur] Son başarılı kur kullanılıyor (${new Date(cached.fetchedAt).toISOString()})`)
          setSnapshot(cached)
          setStatus('stale')
        } else {
          setStatus('error')
        }
      })
      .finally(() => {
        inFlightRef.current = null
        setIsRefreshing(false)
        setNow(Date.now())
      })
    return inFlightRef.current
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS)
    return () => clearInterval(timer)
  }, [])

  // Arka plandan dönüşte veya bağlantı geri geldiğinde, gerekiyorsa tek seferlik yenile.
  useEffect(() => {
    function refreshIfOutdated() {
      if (document.visibilityState !== 'visible') return
      const isOld = !snapshot || Date.now() - snapshot.fetchedAt > AUTO_REFRESH_AFTER_MS
      if (status !== 'fresh' || isOld) refresh()
    }
    document.addEventListener('visibilitychange', refreshIfOutdated)
    window.addEventListener('online', refreshIfOutdated)
    return () => {
      document.removeEventListener('visibilitychange', refreshIfOutdated)
      window.removeEventListener('online', refreshIfOutdated)
    }
  }, [refresh, snapshot, status])

  function handleFocus(code, input) {
    setFocusedCode(code)
    if (code !== source.code) {
      // Tam precision değeri taşı: sadece satır değiştirmek diğer değerleri kaydırmasın.
      const amount = source.amount === null || !rates ? null : convert(source.amount, source.code, code, rates)
      setSource({ code, raw: amount === null ? '' : toEditableString(amount), amount })
    }
    // Yeni sayı yazmak kolay olsun diye değerin tamamını seç. Dokunma/tıklamada
    // mouseup seçimi bozduğu için ilk click'te de tekrar seçilir (handleClick).
    justFocusedRef.current = true
    requestAnimationFrame(() => selectAll(input))
  }

  function handleClick(input) {
    if (!justFocusedRef.current) return
    justFocusedRef.current = false
    selectAll(input)
  }

  function handleChange(code, value) {
    const raw = sanitizeInput(value)
    setSource({ code, raw, amount: parseAmount(raw) })
  }

  function getDisplayValue(code) {
    if (code === source.code) {
      if (focusedCode === code || source.amount === null) return source.raw
      return formatAmount(source.amount)
    }
    if (source.amount === null || !rates) return ''
    return formatAmount(convert(source.amount, source.code, code, rates))
  }

  const { tone, label } = getStatusView(status, snapshot, now)
  const values = Object.fromEntries(CURRENCIES.map(({ code }) => [code, getDisplayValue(code)]))
  // Sütun düzenli görünsün diye tüm satırlar en uzun değere göre aynı font boyutunu kullanır.
  const inputSizeClass = getInputSizeClass(Object.values(values).reduce((a, b) => (b.length > a.length ? b : a)))

  return (
    <main className="app">
      <header className="header">
        <div className="header__text">
          <h1 className="title">Kur</h1>
          <p className={`status status--${tone}`} role="status" aria-live="polite">
            <span className="status__dot" aria-hidden="true" />
            <span className="status__label">{label}</span>
          </p>
        </div>
        <button
          type="button"
          className="refresh"
          onClick={refresh}
          disabled={isRefreshing}
          aria-busy={isRefreshing}
          aria-label={isRefreshing ? 'Kurlar yenileniyor' : 'Kurları yenile'}
        >
          <svg className={isRefreshing ? 'refresh__icon is-spinning' : 'refresh__icon'} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19.25 12a7.25 7.25 0 1 1-2.12-5.13" />
            <path d="M19.4 3.9v4.35h-4.35" />
          </svg>
        </button>
      </header>

      {status === 'error' && !rates && (
        <div className="notice" role="alert">
          <p className="notice__title">Kurlar alınamadı</p>
          <p className="notice__text">
            İnternet bağlantını kontrol edip yenile. Daha önce kaydedilmiş kur bulunmadığı için hesaplama yapılamıyor.
          </p>
        </div>
      )}

      <section className="list" aria-label="Para birimleri">
        {CURRENCIES.map(({ code, name }) => {
          const isActive = code === source.code
          const value = values[code]
          const isInvalid = isActive && source.raw !== '' && source.amount === null
          return (
            <label key={code} className={isActive ? 'row is-active' : 'row'}>
              <CurrencyIcon code={code} />
              <span className="row__meta">
                <span className="row__code">{code}</span>
                <span className="row__name">{name}</span>
              </span>
              <input
                className={`row__input${inputSizeClass}`}
                style={{ '--chars': Math.max(value.length, 1) }}
                type="text"
                inputMode="decimal"
                enterKeyHint="done"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder={rates ? '0' : '—'}
                disabled={!rates}
                value={value}
                aria-label={`${name} (${code}) tutarı`}
                aria-invalid={isInvalid}
                onFocus={(event) => handleFocus(code, event.currentTarget)}
                onClick={(event) => handleClick(event.currentTarget)}
                onBlur={() => {
                  justFocusedRef.current = false
                  setFocusedCode(null)
                }}
                onChange={(event) => handleChange(code, event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
              />
            </label>
          )
        })}
      </section>
    </main>
  )
}
