/* Port of add-products.py: builds products/<handle>.html and products.js content */

export interface Variant {
  id: number;
  sku: string;
  price: number;
  compare_at_price: number;
  option1: string;
  option2: string;
  available: boolean;
}

export interface Product {
  handle: string;
  title: string;
  description: string;
  vendor: string;
  type: string;
  tags: string[];
  status: string;
  price: number;
  compare_at_price: number;
  option1_name: string;
  option2_name: string;
  variants: Variant[];
  images: string[];
  id: number;
  category_emoji: string;
  category_name: string;
}

export const WA_NUMBER = "919425619133";
export const SITE_URL = "https://aviorcart.vercel.app";

const PLACEHOLDER_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E" +
  "%3Crect fill='%23f3f4f6' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' " +
  "dominant-baseline='middle' text-anchor='middle' font-size='80'%3E🛍️%3C/text%3E%3C/svg%3E";

export function slugify(text: string): string {
  const s = text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return s || "product";
}

export function esc(s: unknown): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function sized(url: string, width: number): string {
  if (url.indexOf("cdn.shopify.com") === -1 || url.indexOf("width=") !== -1) return url;
  return url + (url.indexOf("?") !== -1 ? "&" : "?") + `width=${width}`;
}

function money(n: number): string {
  return `₹${Math.round(n)}`;
}

/** JSON safe to embed inside a <script> tag */
function scriptJson(v: unknown): string {
  return JSON.stringify(v).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

function similarHtml(p: Product, all: Product[]): string {
  let pool = all.filter((x) => x.handle !== p.handle && x.category_name === p.category_name);
  if (pool.length < 4) pool = pool.concat(all.filter((x) => x.handle !== p.handle && pool.indexOf(x) === -1));
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 4);
  if (!shuffled.length) return "";
  const cards = shuffled
    .map((x) => {
      const img = x.images[0] ?? "";
      const off = x.compare_at_price > x.price;
      const badge = off ? `<span class="product-card__badge badge-sale">${Math.round((1 - x.price / x.compare_at_price) * 100)}% OFF</span>` : "";
      const old = off ? `<span class="price-old">${money(x.compare_at_price)}</span>` : "";
      return `<div class="product-card" data-animate>
  <div class="product-card__img">
    <a href="${esc(x.handle)}.html">
      <img src="${esc(img)}" alt="${esc(x.title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div style=\\'font-size:36px;display:flex;align-items:center;justify-content:center;height:100%;\\'>🛍️</div>'">
    </a>
    ${badge}
    <div class="product-card__quick">
      <a href="${esc(x.handle)}.html" class="btn btn-gold btn-sm btn-full">View Product</a>
    </div>
  </div>
  <div class="product-card__info">
    <div class="product-card__brand">AVIORCART</div>
    <a href="${esc(x.handle)}.html" class="product-card__name">${esc(x.title)}</a>
    <div class="product-card__price">
      <span class="price-current">${money(x.price)}</span>
      ${old}
    </div>
  </div>
</div>`;
    })
    .join("");
  return `
<div style="margin-top:40px;">
  <div class="section-head"><h2 class="section-title">Similar Products</h2></div>
  <div class="product-grid">${cards}</div>
</div>`;
}

export function productHtml(p: Product, all: Product[]): string {
  const title = p.title;
  const desc = p.description || title;
  const imgs = p.images;
  const mainImg = imgs[0] ?? "";
  const thumbs = imgs
    .map(
      (u, i) =>
        `<div class="gallery__thumb${i === 0 ? " active" : ""}" data-src="${esc(sized(u, 900))}">` +
        `<img src="${esc(sized(u, 160))}" alt="${esc(title)}" loading="lazy" decoding="async" onerror="this.style.display='none'"></div>`,
    )
    .join("");
  let variantBlock = "";
  if (p.variants.length > 1) {
    const btns = p.variants
      .map(
        (v, i) =>
          `<button class="variant-btn${i === 0 ? " active" : ""}" data-value="${esc(v.option1)}" onclick="selectVariantOpt(this)">${esc(v.option1)}</button>`,
      )
      .join("");
    variantBlock =
      `<div class="variant-wrap" data-option="${esc(p.option1_name)}" style="margin-bottom:16px;">` +
      `<div class="variant-label">${esc(p.option1_name)}: <span class="variant-selected" id="selected-opt1">${esc(p.variants[0]?.option1 ?? "")}</span></div>` +
      `<div class="variant-options" id="variant-opts">${btns}</div></div>`;
  }
  const off = p.compare_at_price > p.price;
  let priceBlock = `<span class="product-price-main" id="product-price">${money(p.price)}</span>`;
  if (off) {
    priceBlock +=
      `<span class="product-price-old">${money(p.compare_at_price)}</span>` +
      `<span class="product-price-discount">${Math.round((1 - p.price / p.compare_at_price) * 100)}% off</span>`;
  }
  const tagsStr = p.tags.length ? p.tags.join(", ") : "—";
  const sku = p.variants[0]?.sku || "—";
  const firstId = p.variants[0]?.id ?? p.id * 1000 + 1;
  const pageUrl = `${SITE_URL}/products/${p.handle}.html`;
  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    image: p.images.slice(0, 5),
    description: desc.slice(0, 300),
    sku: p.handle,
    brand: { "@type": "Brand", name: "AVIORCART" },
    offers: {
      "@type": "Offer",
      url: pageUrl,
      priceCurrency: "INR",
      price: String(p.price),
      availability: p.variants.some((v) => v.available) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  }).replace(/</g, "\\u003c");
  const seo =
    `<link rel="canonical" href="${esc(pageUrl)}">\n  <meta property="og:type" content="product">\n  <meta property="og:site_name" content="AVIORCART">\n` +
    `  <meta property="og:title" content="${esc(title)} — AVIORCART">\n  <meta property="og:description" content="${esc(desc.slice(0, 150))}">\n` +
    `  <meta property="og:url" content="${esc(pageUrl)}">\n  <meta property="og:image" content="${esc(p.images[0] ?? "")}">\n  <meta name="twitter:card" content="summary_large_image">\n` +
    `  <script type="application/ld+json">${ld}</script>`;
  const wa = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hi! I want to order: ${title} Price: ${money(p.price)}`)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script src="/assets/dist/boot.js"></script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} — AVIORCART</title>
  <meta name="description" content="${esc(desc.slice(0, 150))}">
  ${seo}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="manifest" href="/assets/manifest.json">
  <link rel="apple-touch-icon" sizes="152x152" href="/assets/icon-152x152.png">
  <script>
    if('serviceWorker' in navigator){
      window.addEventListener('load',function(){
        navigator.serviceWorker.register('/assets/sw.js',{scope:'/'})
          .then(()=>{}).catch(()=>{});
      });
    }
  </script>
  <link rel="stylesheet" href="../assets/theme.css">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⭐</text></svg>">
</head>
<body>
<div id="header-placeholder"></div>
<main id="main-content">
<div class="product-page">
  <div class="container">
    <nav class="breadcrumb">
      <a href="../index.html">Home</a><span class="breadcrumb__sep">›</span>
      <a href="../collections.html?cat=${esc(p.category_name)}"> ${esc(p.category_name)}</a><span class="breadcrumb__sep">›</span>
      <span>${esc(title)}</span>
    </nav>

    <div class="product-layout">
      <div>
        <div class="gallery__main">
          <img id="gallery-main" src="${esc(sized(mainImg, 900))}" alt="${esc(title)}" loading="eager" onerror="this.src='${PLACEHOLDER_SVG}'">
        </div>
        <div class="gallery__thumbs">${thumbs}</div>
      </div>

      <div class="product-info">
        <div class="product-info__brand">AVIORCART</div>
        <h1 class="product-info__title">${esc(title)}</h1>
        <div class="product-info__rating">
          <span class="rating-box">⭐ New</span>
          <span class="rating-count">Be the first to review</span>
        </div>
        <div class="product-info__divider"></div>
        <div class="product-info__price">
          ${priceBlock}
        </div>
        <div class="product-info__divider"></div>

        ${variantBlock}

        <div class="qty-wrap">
          <div class="variant-label" style="margin-bottom:8px;">Quantity</div>
          <div class="qty-selector">
            <button class="qty-btn" onclick="adjustQty(-1)">−</button>
            <input class="qty-input" id="qty-input" type="number" value="1" min="1" max="99">
            <button class="qty-btn" onclick="adjustQty(1)">+</button>
          </div>
        </div>

        <div class="product-actions">
          <button id="atc-btn" class="btn btn-gold btn-lg btn-atc" onclick="handleAddToCart(this)">
            🛒 Add to Cart
          </button>
          <button id="buy-btn" class="btn btn-black btn-lg btn-buy" onclick="handleBuyNow()">
            ⚡ Buy Now
          </button>
        </div>

        <div style="margin-bottom:16px;">
          <a href="${esc(wa)}" target="_blank" class="btn btn-full" style="background:#25D366;color:#fff;gap:8px;border-radius:8px;padding:12px;">
            💬 Order via WhatsApp
          </a>
        </div>

        <div class="product-offers">
          <div class="product-offers__title">🏷️ Available Offers</div>
          <div class="offer-item">🏦 <span><b>Bank Offer:</b> 5% cashback on payments</span></div>
          <div class="offer-item">🚚 <span><b>FREE Delivery</b> on Every Order 🎉</span></div>
          <div class="offer-item">🔄 <span><b>Easy Return</b> within 10 days</span></div>
        </div>

        <div class="product-meta-grid">
          <div class="meta-item"><span class="meta-item__icon">🚚</span> FREE Delivery</div>
          <div class="meta-item"><span class="meta-item__icon">🔄</span> 10-day returns</div>
          <div class="meta-item"><span class="meta-item__icon">🔒</span> Secure payment</div>
          <div class="meta-item"><span class="meta-item__icon">✅</span> 100% genuine</div>
        </div>
      </div>
    </div>

    <div class="tabs">
      <div class="tab-nav">
        <button class="tab-btn active" onclick="switchTab('tab-desc',this)">Description</button>
        <button class="tab-btn" onclick="switchTab('tab-details',this)">Product Details</button>
        <button class="tab-btn" onclick="switchTab('tab-ship',this)">Shipping & Returns</button>
      </div>
      <div class="tab-content active" id="tab-desc">${esc(desc)}</div>
      <div class="tab-content" id="tab-details">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:10px 0;color:#6b7280;width:40%;">Brand</td><td style="font-weight:500;">AVIORCART</td></tr>
          <tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:10px 0;color:#6b7280;">Type</td><td style="font-weight:500;">${esc(p.type || "—")}</td></tr>
          <tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:10px 0;color:#6b7280;">SKU</td><td style="font-weight:500;">${esc(sku)}</td></tr>
          <tr><td style="padding:10px 0;color:#6b7280;">Tags</td><td style="font-weight:500;">${esc(tagsStr)}</td></tr>
        </table>
      </div>
      <div class="tab-content" id="tab-ship">
        <p><b>FREE Delivery</b> on Every Order 🎉. Standard: 3–7 days. Express: 1–2 days.</p>
        <p style="margin-top:12px;"><b>Returns:</b> 10-day easy returns on unused items in original packaging.</p>
      </div>
    </div>
    ${similarHtml(p, all)}
  </div>
</div>
</main>
<div id="footer-placeholder"></div>

<script>
const __product = ${scriptJson(p)};
const __variants = ${scriptJson(p.variants)};
let __selectedVariantId = ${firstId};
</script>
<script src="../assets/products.js"></script>
<script src="../assets/cart.js"></script>
<script src="../assets/checkout.js"></script>
<script src="../assets/layout.js"></script>
<script>
document.querySelectorAll('.gallery__thumb').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.gallery__thumb').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    const main = document.getElementById('gallery-main');
    if (main) { main.style.opacity='0'; setTimeout(() => { main.src = t.dataset.src; main.style.opacity='1'; }, 150); main.style.transition='opacity 0.15s'; }
  });
});

function switchTab(id, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function adjustQty(d) {
  const inp = document.getElementById('qty-input');
  if (inp) inp.value = Math.max(1, (parseInt(inp.value)||1) + d);
}

function selectVariantOpt(btn) {
  btn.closest('.variant-options')?.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const label = btn.closest('.variant-wrap')?.querySelector('.variant-selected');
  if (label) label.textContent = btn.dataset.value;
  const val = btn.dataset.value;
  const match = __variants.find(v => v.option1 === val);
  if (match) {
    __selectedVariantId = match.id;
    const priceEl = document.getElementById('product-price');
    if (priceEl) priceEl.textContent = '₹' + Math.round(match.price).toLocaleString('en-IN');
  }
}

function handleAddToCart(btn) {
  const qty = parseInt(document.getElementById('qty-input')?.value||1);
  addToCart(__product, __selectedVariantId, qty, btn);
}

function handleBuyNow() {
  const qty = parseInt(document.getElementById('qty-input')?.value||1);
  setBuyNowItem(__product, __selectedVariantId, qty);
  window.location.href = '../checkout.html?mode=buynow';
}
</script>
</body>
</html>
`;
}

/* ---------- products.js read / write ---------- */
const START = "const PRODUCTS = ";
const END_ANCHOR = "\n];\n\nfunction getProductByHandle";

export interface ParsedJs {
  content: string;
  start: number;
  end: number;
  products: Product[];
}

export function parseProductsJs(content: string): ParsedJs {
  const si = content.indexOf(START);
  if (si === -1) throw new Error("products.js: 'const PRODUCTS = ' not found");
  const start = si + START.length;
  const ei = content.indexOf(END_ANCHOR, start);
  if (ei === -1) throw new Error("products.js: end of PRODUCTS array not found");
  const end = ei + 3;
  const arr = content.slice(start, end - 1);
  return { content, start, end, products: JSON.parse(arr) as Product[] };
}

export function writeProductsJs(parsed: ParsedJs, products: Product[]): string {
  return parsed.content.slice(0, parsed.start) + JSON.stringify(products, null, 2) + ";" + parsed.content.slice(parsed.end);
}

export function sitemapAdd(xml: string, handle: string): string {
  const loc = `${SITE_URL}/products/${handle}.html`;
  if (xml.indexOf(`<loc>${loc}</loc>`) !== -1) return xml;
  const day = new Date().toISOString().slice(0, 10);
  const entry = `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${day}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  return xml.replace("</urlset>", `${entry}</urlset>`);
}

export function sitemapRemove(xml: string, handle: string): string {
  const loc = `${SITE_URL}/products/${handle}.html`;
  const re = new RegExp(`\\s*<url>\\s*<loc>${loc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</loc>[\\s\\S]*?</url>`, "g");
  return xml.replace(re, "");
}
