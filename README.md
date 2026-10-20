# Kur — Döviz Çevirici

Yurtdışında telefondan hızlı kullanım için tasarlanmış, mobil öncelikli döviz çevirici.

Desteklenen para birimleri: 🇹🇷 TRY · 🇲🇰 MKD · 🇪🇺 EUR · 🇺🇸 USD · 🇬🇧 GBP · 🥇 GOLD (gram altın)

- Altı birim aynı ekranda; herhangi birine dokunup tutar girersen diğerleri anında hesaplanır.
- Backend, veritabanı, API key yok. Kur verisi tarayıcıda cache'lenir.
- PWA: iPhone'da "Ana Ekrana Ekle" ile kurulabilir, internet yokken son kurla çalışır.
- Sistem temasına göre otomatik açık/koyu mod.

## Gereksinimler

- Node.js 20.19+ (Vite 8)

## Local çalıştırma

```bash
npm install
npm run dev
```

Telefondan aynı ağda denemek için: `npm run dev -- --host` ve terminalde görünen IP adresini aç.

> Service worker yalnızca production build'de kaydedilir. Offline davranışı denemek için `npm run build && npm run preview` kullan.

## Build

```bash
npm run build     # dist/ klasörünü üretir (dist/sw.js dahil)
npm run preview   # production build'i localde sunar
```

## Vercel deploy

`vercel.json` hazır: Vite framework ayarı, SPA rewrite'ı (`/(.*)` → `/index.html`; statik dosyalar her zaman önceliklidir), `sw.js`/`index.html` için cache'siz, `assets/` için immutable cache header'ları.

CLI ile:

```bash
npm i -g vercel
vercel login
vercel          # ilk seferde projeyi bağlar, preview deploy
vercel --prod   # production deploy
```

Alternatif olarak repoyu GitHub'a push edip Vercel panelinden "Import Project" ile bağlayabilirsin; ek ayar gerekmez.

## Kur API'si

Kaynak: [Frankfurter](https://frankfurter.dev) — ücretsiz, API key gerektirmez, CORS açık.

```
GET https://api.frankfurter.dev/v2/rates?base=EUR&quotes=TRY,MKD,USD,GBP
GET https://api.frankfurter.dev/v2/rates?base=XAU&quotes=EUR
```

- İki istek paralel atılır ve tek snapshot olarak ele alınır; biri başarısızsa yenileme başarısız sayılır.
- Altın arayüzde **gram** olarak gösterilir (kod: `GOLD`); API tarafında `XAU` (troy ons) kullanılır.
- XAU, EUR bazında yalnızca 2 anlamlı basamakla döner (`0.00027`, ~%2 hata). Bu yüzden XAU bazında sorgulanır (`1 ons = 3702.79 EUR`).
- Gram kuru: `rates.GOLD = 31.1034768 / onsFiyatıEUR` (1 EUR'nun kaç gram altın ettiği). Ara yuvarlama yapılmaz; cache'e bu normalize gram kuru yazılır.
- Örnek: 1 gram ≈ 119,05 EUR; 1000 TRY ≈ 0,151 gram.

- MKD yalnızca **v2** uç noktasında var (v1 sadece ECB listesini içerir ve MKD yoktur).
- Tüm kurlar EUR bazlı saklanır; çapraz kur client-side hesaplanır:
  `sonuç = tutar / kur[kaynak] * kur[hedef]`
- Kurlar merkez bankalarının günlük referans kurlarıdır; anlık piyasa / döviz bürosu kuru değildir.
- İstek yalnızca şu durumlarda atılır: uygulama açılışı, manuel yenileme, uygulama arka plandan döndüğünde (kur 1 saatten eskiyse veya son istek başarısızsa), bağlantı geri geldiğinde. Tutar girerken hiç istek atılmaz.
- Devam eden bir istek varken yenileme butonu yeni istek açmaz.

## Offline / cache davranışı

**Kur verisi — localStorage (`kur:rates:v1`)**

Her başarılı istekten sonra `{ rates, rateDate, fetchedAt }` kaydedilir. (Anahtar `kur:rates:v3`; altın birimi değiştiği için eski `v1`/`v2` cache'leri kullanılmaz.)

| Durum | Gösterge | Davranış |
| --- | --- | --- |
| İstek başarılı | 🟢 Güncel • 16:55 | Yeni kur kullanılır ve kaydedilir |
| İstek başarısız, cache var | 🟡 Eski kur • 2 saat önce | Son başarılı kur kullanılır |
| İstek başarısız, cache yok | 🔴 Kur alınamadı | Hesaplama yapılmaz, hata mesajı gösterilir |

Açılışta cache'teki kur hemen ekrana gelir; istek arka planda güncellenir. Yenileme sırasında mevcut değerler ekranda kalır.

**Uygulama dosyaları — service worker (`dist/sw.js`)**

- Build sonunda `vite.config.js` içindeki küçük eklenti `dist/` içeriğini listeler, `src/sw.js` şablonuna precache listesini ve içerik hash'inden türeyen cache sürümünü yazar.
- HTML, JS, CSS, ikonlar ve manifest cache-first sunulur; uygulama internet yokken de açılır.
- Yeni deploy'da `sw.js` değişir, yeni sürüm arka planda kurulur ve eski cache silinir. Yeni sürüm bir sonraki açılışta görünür.
- Kur API'si service worker tarafından cache'lenmez; kur cache'i yalnızca localStorage'dadır.

## Proje yapısı

```
index.html                 PWA / iOS meta etiketleri
vite.config.js             React + service worker üretim eklentisi
vercel.json                Vercel build, SPA rewrite, cache header'ları
public/
  manifest.webmanifest
  favicon.svg
  icons/                   192, 512 (any + maskable), apple-touch-icon 180
src/
  main.jsx                 Render + service worker kaydı
  App.jsx                  Arayüz ve durum yönetimi
  CurrencyIcon.jsx         Yuvarlak SVG bayrak / altın ikonları
  index.css                Mobil öncelikli stiller, açık/koyu tema
  currencies.js            Para birimi listesi ve varsayılanlar
  rates.js                 Frankfurter isteği + localStorage cache
  convert.js               Girdi ayrıştırma, dönüşüm, Türkçe sayı formatı
  sw.js                    Service worker şablonu (build'de dist/sw.js olur)
```

## Tasarım

iOS "inset grouped list" + sade fintech yönü: tek liste yüzeyi, ikon hizasından başlayan ince ayırıcılar, büyük tabular rakamlar.
Aktif (kaynak) satır hafif accent tonu ve renkli kodla ayrılır, odaktayken ton biraz koyulaşır. Satır yüksekliği ekrana göre esner
(60–108px); altı satır iPhone'da scroll gerektirmez. Uzun değerlerde tüm satırların fontu birlikte küçülür, gerekirse önce para birimi adı kısalır.
Input fontu hiçbir durumda 16px altına inmez (iOS zoom). Renkler `src/index.css` başındaki token'lardadır.

## Girdi kuralları

- Hem `,` hem `.` ondalık ayırıcı olarak kabul edilir (`12,5` = `12.5`).
- İkisi birlikte varsa sondaki ondalıktır (`1.234,56`, `1,234.56`).
- Aynı ayırıcı birden çok kez geçerse binlik sayılır (`1.000.000`).
- Rakam ve ayırıcı dışındaki karakterler (eksi işareti dahil) yok sayılır.
- Alan silinirse diğer tüm değerler temizlenir.
- Hesaplamalar tam precision ile yapılır; yalnızca ekranda yuvarlanır. 1'den küçük değerler 4 anlamlı basamakla gösterilir (`0,01798`).
