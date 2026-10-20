// Yuvarlak, dependency'siz para birimi ikonları (32×32 viewBox).
// Emoji bayraklar Windows'ta harf olarak görünür ve boyutları tutarsızdır; bunlar her yerde aynıdır.

const CENTER = 16

function starPoints(cx, cy, outer, inner, rotationDeg) {
  return Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 ? inner : outer
    const angle = ((rotationDeg + index * 36) * Math.PI) / 180
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`
  }).join(' ')
}

function rayPoints(angleDeg, spreadDeg, length) {
  return [angleDeg - spreadDeg, angleDeg + spreadDeg]
    .map((deg) => {
      const angle = (deg * Math.PI) / 180
      return `${(CENTER + length * Math.cos(angle)).toFixed(2)},${(CENTER + length * Math.sin(angle)).toFixed(2)}`
    })
    .concat(`${CENTER},${CENTER}`)
    .join(' ')
}

const US_STRIPE = 32 / 13

const ICONS = {
  TRY: (
    <>
      <rect width="32" height="32" fill="#E30A17" />
      <circle cx="13" cy="16" r="7.2" fill="#fff" />
      <circle cx="14.8" cy="16" r="5.8" fill="#E30A17" />
      <polygon points={starPoints(20.8, 16, 3, 1.2, 180)} fill="#fff" />
    </>
  ),
  MKD: (
    <>
      <rect width="32" height="32" fill="#D20000" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <polygon key={angle} points={rayPoints(angle, angle % 90 ? 7 : 9, 24)} fill="#FFE600" />
      ))}
      <circle cx={CENTER} cy={CENTER} r="5.6" fill="#D20000" />
      <circle cx={CENTER} cy={CENTER} r="4.5" fill="#FFE600" />
    </>
  ),
  EUR: (
    <>
      <rect width="32" height="32" fill="#003399" />
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index * 30 * Math.PI) / 180
        return (
          <polygon
            key={index}
            points={starPoints(CENTER + 8.5 * Math.cos(angle), CENTER + 8.5 * Math.sin(angle), 1.55, 0.62, -90)}
            fill="#FFCC00"
          />
        )
      })}
    </>
  ),
  USD: (
    <>
      <rect width="32" height="32" fill="#fff" />
      {Array.from({ length: 7 }, (_, index) => (
        <rect key={index} y={index * 2 * US_STRIPE} width="32" height={US_STRIPE} fill="#B22234" />
      ))}
      <rect width="16" height={7 * US_STRIPE} fill="#3C3B6E" />
      {[4, 8.5, 13].flatMap((y) =>
        [4, 8, 12].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.85" fill="#fff" />),
      )}
    </>
  ),
  GBP: (
    <>
      <rect width="32" height="32" fill="#012169" />
      <path d="M0 0 32 32M32 0 0 32" stroke="#fff" strokeWidth="6.5" />
      <path d="M0 0 32 32M32 0 0 32" stroke="#C8102E" strokeWidth="2.2" />
      <path d="M16 0v32M0 16h32" stroke="#fff" strokeWidth="9" />
      <path d="M16 0v32M0 16h32" stroke="#C8102E" strokeWidth="5.2" />
    </>
  ),
  GOLD: (
    <>
      <defs>
        <linearGradient id="icon-xau-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F7E08F" />
          <stop offset="0.55" stopColor="#E0B44A" />
          <stop offset="1" stopColor="#B8862B" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" fill="url(#icon-xau-gradient)" />
      <circle cx={CENTER} cy={CENTER} r="11.5" fill="none" stroke="#fff" strokeOpacity="0.35" />
      <text
        x={CENTER}
        y="20.4"
        textAnchor="middle"
        fontSize="12"
        fontWeight="700"
        fontFamily="-apple-system, BlinkMacSystemFont, system-ui, sans-serif"
        fill="#5E4108"
      >
        Au
      </text>
    </>
  ),
}

export default function CurrencyIcon({ code }) {
  const clipId = `currency-icon-${code}`
  return (
    <svg className="currency-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <clipPath id={clipId}>
        <circle cx={CENTER} cy={CENTER} r={CENTER} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>{ICONS[code]}</g>
      <circle className="currency-icon__ring" cx={CENTER} cy={CENTER} r="15.5" />
    </svg>
  )
}
