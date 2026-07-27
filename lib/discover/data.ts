import type { Source, Brand, Category, Product, Offer } from "./types";

// ---------------------------------------------------------------------------
// Curated seed data. This is REAL, hand-picked catalog structure — authentic
// products mapped to their official / authorized sources with plausible prices.
// It makes the site fully functional offline. Replace lib/discover/store.ts's
// backing with live affiliate feeds to go to production (see README).
// ---------------------------------------------------------------------------

export const SOURCES: Source[] = [
  { id: "apple", name: "Apple", kind: "brand", official: true, domain: "apple.com", code: "APL" },
  { id: "samsung", name: "Samsung", kind: "brand", official: true, domain: "samsung.com", code: "SMS" },
  { id: "sony", name: "Sony", kind: "brand", official: true, domain: "sony.com", code: "SNY" },
  { id: "bose", name: "Bose", kind: "brand", official: true, domain: "bose.com", code: "BSE" },
  { id: "sonos", name: "Sonos", kind: "brand", official: true, domain: "sonos.com", code: "SNO" },
  { id: "garmin", name: "Garmin", kind: "brand", official: true, domain: "garmin.com", code: "GMN" },
  { id: "dyson", name: "Dyson", kind: "brand", official: true, domain: "dyson.com", code: "DYS" },
  { id: "anker", name: "Anker", kind: "brand", official: true, domain: "anker.com", code: "ANK" },
  { id: "canon", name: "Canon", kind: "brand", official: true, domain: "canon.com", code: "CAN" },
  { id: "gopro", name: "GoPro", kind: "brand", official: true, domain: "gopro.com", code: "GPR" },
  { id: "dell", name: "Dell", kind: "brand", official: true, domain: "dell.com", code: "DEL" },
  { id: "logitech", name: "Logitech", kind: "brand", official: true, domain: "logitech.com", code: "LOG" },
  { id: "jbl", name: "JBL", kind: "brand", official: true, domain: "jbl.com", code: "JBL" },
  { id: "amazon", name: "Amazon", kind: "marketplace", official: true, domain: "amazon.com", code: "AMZ" },
  { id: "noon", name: "Noon", kind: "marketplace", official: true, domain: "noon.com", code: "NOO" },
];

export const CATEGORIES: Category[] = [
  { id: "audio", slug: "audio", name: "Audio", blurb: "Headphones, earbuds and speakers." },
  { id: "wearables", slug: "wearables", name: "Wearables", blurb: "Smartwatches and fitness bands." },
  { id: "mobile", slug: "mobile", name: "Mobile & Tablets", blurb: "Phones and tablets, official-source only." },
  { id: "home", slug: "home", name: "Home Tech", blurb: "Cleaning, air and everyday home devices." },
  { id: "cameras", slug: "cameras", name: "Cameras", blurb: "Mirrorless, action and vlog cameras." },
  { id: "computing", slug: "computing", name: "Computing", blurb: "Laptops and desk gear, official-source only." },
];

export const BRANDS: Brand[] = [
  { id: "apple", slug: "apple", name: "Apple", official: true, monogram: "Ap", hue: 220, blurb: "iPhone, Apple Watch, AirPods and Mac — sold from Apple and authorized sellers.", categoryIds: ["audio", "wearables", "mobile", "computing"] },
  { id: "samsung", slug: "samsung", name: "Samsung", official: true, monogram: "Sa", hue: 210, blurb: "Galaxy phones, tablets and watches from Samsung's official channels.", categoryIds: ["wearables", "mobile"] },
  { id: "sony", slug: "sony", name: "Sony", official: true, monogram: "So", hue: 250, blurb: "Audio and imaging, verified from Sony and authorized retail.", categoryIds: ["audio", "cameras"] },
  { id: "bose", slug: "bose", name: "Bose", official: true, monogram: "Bo", hue: 0, blurb: "Noise-cancelling headphones and speakers, official source.", categoryIds: ["audio"] },
  { id: "sonos", slug: "sonos", name: "Sonos", official: true, monogram: "Sn", hue: 30, blurb: "Home speakers and systems from Sonos.", categoryIds: ["audio"] },
  { id: "garmin", slug: "garmin", name: "Garmin", official: true, monogram: "Ga", hue: 200, blurb: "GPS and multisport watches, official warranty.", categoryIds: ["wearables"] },
  { id: "dyson", slug: "dyson", name: "Dyson", official: true, monogram: "Dy", hue: 300, blurb: "Cordless cleaning and air treatment, sold from Dyson.", categoryIds: ["home"] },
  { id: "anker", slug: "anker", name: "Anker", official: true, monogram: "An", hue: 190, blurb: "Charging and audio accessories, official Anker store.", categoryIds: ["audio", "home"] },
  { id: "canon", slug: "canon", name: "Canon", official: true, monogram: "Ca", hue: 350, blurb: "Cameras and lenses, official Canon and authorized retail.", categoryIds: ["cameras"] },
  { id: "gopro", slug: "gopro", name: "GoPro", official: true, monogram: "Go", hue: 200, blurb: "Action cameras from GoPro, official warranty.", categoryIds: ["cameras"] },
  { id: "dell", slug: "dell", name: "Dell", official: true, monogram: "De", hue: 215, blurb: "Laptops and monitors from Dell's official store.", categoryIds: ["computing"] },
  { id: "logitech", slug: "logitech", name: "Logitech", official: true, monogram: "Lo", hue: 195, blurb: "Keyboards, mice and desk gear, official Logitech.", categoryIds: ["computing", "audio"] },
  { id: "jbl", slug: "jbl", name: "JBL", official: true, monogram: "Jb", hue: 20, blurb: "Portable speakers and audio from JBL.", categoryIds: ["audio"] },
];

// helper to build a short, deterministic price history (base currency)
function hist(base: number, deltas: number[]): { date: string; price: number }[] {
  const days = ["2026-02-01", "2026-03-01", "2026-04-01", "2026-05-01", "2026-06-01", "2026-07-01"];
  return deltas.map((d, i) => ({ date: days[i], price: Math.round((base + d) * 100) / 100 }));
}

export const PRODUCTS: Product[] = [
  {
    id: "p-xm5", slug: "sony-wh-1000xm5", name: "Sony WH-1000XM5", brandId: "sony", categoryId: "audio",
    summary: "Reference wireless noise cancelling over-ears.",
    description: "Sony's flagship over-ear headphones with eight microphones for industry-leading noise cancelling, 30-hour battery and multipoint pairing. Listed here only from Sony and authorized sellers.",
    specs: [{ label: "Type", value: "Over-ear, closed" }, { label: "Battery", value: "30 h" }, { label: "ANC", value: "8-mic adaptive" }, { label: "Weight", value: "250 g" }],
    gtin: "0027242923058", hue: 250, currency: "USD", history: hist(399, [409, 399, 399, 389, 379, 379]),
  },
  {
    id: "p-qcu", slug: "bose-quietcomfort-ultra", name: "Bose QuietComfort Ultra Headphones", brandId: "bose", categoryId: "audio",
    summary: "Immersive spatial audio with deep quiet.",
    description: "Bose's top noise-cancelling headphones with CustomTune calibration and Immersive Audio. Official-source listings only.",
    specs: [{ label: "Type", value: "Over-ear" }, { label: "Battery", value: "24 h" }, { label: "Spatial", value: "Bose Immersive" }, { label: "Weight", value: "253 g" }],
    gtin: "0017817840620", hue: 8, currency: "USD", history: hist(429, [429, 429, 419, 399, 399, 399]),
  },
  {
    id: "p-era3", slug: "sonos-era-300", name: "Sonos Era 300", brandId: "sonos", categoryId: "audio",
    summary: "Spatial-audio smart speaker.",
    description: "A six-driver speaker tuned for Dolby Atmos spatial audio, with Wi-Fi, Bluetooth and line-in. Sold from Sonos and authorized retail.",
    specs: [{ label: "Drivers", value: "6" }, { label: "Spatial", value: "Dolby Atmos" }, { label: "Connectivity", value: "Wi-Fi / BT" }],
    hue: 32, currency: "USD", history: hist(449, [449, 449, 449, 449, 449, 449]),
  },
  {
    id: "p-app2", slug: "apple-airpods-pro-2", name: "AirPods Pro (2nd gen, USB-C)", brandId: "apple", categoryId: "audio",
    summary: "Adaptive audio earbuds with USB-C.",
    description: "Apple's H2 earbuds with adaptive noise cancelling, transparency and personalized spatial audio. Verified from Apple and authorized sellers.",
    specs: [{ label: "Chip", value: "Apple H2" }, { label: "Case", value: "USB-C, MagSafe" }, { label: "ANC", value: "Adaptive" }],
    gtin: "0195949052437", hue: 220, currency: "USD", history: hist(249, [249, 249, 239, 229, 229, 229]),
  },
  {
    id: "p-space1", slug: "anker-soundcore-space-one", name: "Anker Soundcore Space One", brandId: "anker", categoryId: "audio",
    summary: "Value noise-cancelling over-ears.",
    description: "Long-battery noise-cancelling headphones with LDAC. Official Anker store and authorized retail.",
    specs: [{ label: "Battery", value: "40 h (ANC)" }, { label: "Codec", value: "LDAC" }, { label: "Weight", value: "263 g" }],
    hue: 190, currency: "USD", history: hist(99, [99, 99, 95, 89, 89, 89]),
  },
  {
    id: "p-aw10", slug: "apple-watch-series-10", name: "Apple Watch Series 10", brandId: "apple", categoryId: "wearables",
    summary: "Thinner case, wide-angle display.",
    description: "The largest, most advanced Apple Watch display in a thinner case, with fast charging and depth sensing. Official-source listings only.",
    specs: [{ label: "Sizes", value: "42 / 46 mm" }, { label: "Display", value: "Wide-angle OLED" }, { label: "Charge", value: "Fast" }],
    gtin: "0195949723001", hue: 218, currency: "USD", history: hist(399, [399, 399, 399, 399, 389, 399]),
  },
  {
    id: "p-fenix8", slug: "garmin-fenix-8", name: "Garmin fēnix 8", brandId: "garmin", categoryId: "wearables",
    summary: "AMOLED multisport adventure watch.",
    description: "Rugged multisport GPS watch with AMOLED display, built-in flashlight, diving and long battery. Sold from Garmin with official warranty.",
    specs: [{ label: "Display", value: "AMOLED" }, { label: "Water", value: "Dive-rated" }, { label: "Battery", value: "Up to 29 d" }],
    hue: 205, currency: "USD", history: hist(999, [999, 999, 999, 979, 949, 949]),
  },
  {
    id: "p-gw7", slug: "samsung-galaxy-watch-7", name: "Samsung Galaxy Watch7", brandId: "samsung", categoryId: "wearables",
    summary: "Health-focused smartwatch.",
    description: "Wear OS smartwatch with advanced sleep and body composition sensing. Official Samsung and authorized channels.",
    specs: [{ label: "Sizes", value: "40 / 44 mm" }, { label: "OS", value: "Wear OS" }, { label: "Sensors", value: "BioActive" }],
    hue: 212, currency: "USD", history: hist(299, [299, 299, 289, 279, 279, 279]),
  },
  {
    id: "p-ip16p", slug: "apple-iphone-16-pro", name: "iPhone 16 Pro", brandId: "apple", categoryId: "mobile",
    summary: "Titanium pro phone, A18 Pro.",
    description: "Pro camera system, A18 Pro chip and the Camera Control button. Verified from Apple and authorized sellers — imitations excluded.",
    specs: [{ label: "Chip", value: "A18 Pro" }, { label: "Display", value: "6.3\" ProMotion" }, { label: "Build", value: "Titanium" }],
    gtin: "0195949723551", hue: 222, currency: "USD", history: hist(999, [999, 999, 999, 999, 999, 999]),
  },
  {
    id: "p-s24u", slug: "samsung-galaxy-s24-ultra", name: "Samsung Galaxy S24 Ultra", brandId: "samsung", categoryId: "mobile",
    summary: "Titanium flagship with S Pen.",
    description: "Galaxy AI flagship with a 200MP camera, titanium frame and built-in S Pen. Official Samsung and authorized retail only.",
    specs: [{ label: "Camera", value: "200 MP" }, { label: "Display", value: "6.8\" QHD+" }, { label: "S Pen", value: "Built-in" }],
    hue: 208, currency: "USD", history: hist(1299, [1299, 1299, 1249, 1199, 1199, 1199]),
  },
  {
    id: "p-tabs10", slug: "samsung-galaxy-tab-s10-plus", name: "Samsung Galaxy Tab S10+", brandId: "samsung", categoryId: "mobile",
    summary: "AMOLED productivity tablet.",
    description: "Large AMOLED tablet with S Pen included, tuned for note-taking and multitasking. Official-source listings only.",
    specs: [{ label: "Display", value: "12.4\" AMOLED" }, { label: "S Pen", value: "Included" }, { label: "Rating", value: "IP68" }],
    hue: 214, currency: "USD", history: hist(999, [999, 999, 979, 949, 949, 949]),
  },
  {
    id: "p-v15", slug: "dyson-v15-detect", name: "Dyson V15 Detect", brandId: "dyson", categoryId: "home",
    summary: "Laser dust-detecting cordless vacuum.",
    description: "Cordless vacuum with a laser that reveals microscopic dust and a sensor that counts particles. Sold from Dyson with official warranty.",
    specs: [{ label: "Type", value: "Cordless" }, { label: "Runtime", value: "Up to 60 min" }, { label: "Sensor", value: "Piezo count" }],
    hue: 300, currency: "USD", history: hist(749, [749, 749, 749, 699, 699, 699]),
  },
  {
    id: "p-hotcool", slug: "dyson-purifier-hot-cool", name: "Dyson Purifier Hot+Cool", brandId: "dyson", categoryId: "home",
    summary: "Purifying fan heater.",
    description: "HEPA-filtering purifier that heats in winter and cools in summer, with sealed filtration. Official Dyson source.",
    specs: [{ label: "Filter", value: "HEPA H13" }, { label: "Modes", value: "Heat / Cool" }, { label: "Control", value: "App / remote" }],
    hue: 292, currency: "USD", history: hist(569, [569, 569, 559, 549, 549, 549]),
  },
  {
    id: "p-prime", slug: "anker-prime-100w-charger", name: "Anker Prime 100W Charger", brandId: "anker", categoryId: "home",
    summary: "Compact three-port GaN charger.",
    description: "A 100W GaNPrime charger with two USB-C and one USB-A, small enough for a laptop bag. Official Anker store and authorized retail.",
    specs: [{ label: "Power", value: "100 W" }, { label: "Ports", value: "2× C, 1× A" }, { label: "Tech", value: "GaNPrime" }],
    hue: 188, currency: "USD", history: hist(79.99, [79.99, 79.99, 74.99, 69.99, 69.99, 69.99]),
  },
  // ---- Cameras ----
  {
    id: "p-a7iv", slug: "sony-alpha-7-iv", name: "Sony Alpha 7 IV", brandId: "sony", categoryId: "cameras",
    summary: "Full-frame hybrid mirrorless.",
    description: "A 33MP full-frame mirrorless built for stills and 4K video, with fast hybrid autofocus. Verified from Sony and authorized imaging retail.",
    specs: [{ label: "Sensor", value: "33 MP full-frame" }, { label: "Video", value: "4K 60p" }, { label: "AF", value: "759-point hybrid" }, { label: "Mount", value: "Sony E" }],
    hue: 248, currency: "USD", history: hist(2499, [2499, 2499, 2499, 2399, 2399, 2398]),
  },
  {
    id: "p-r6ii", slug: "canon-eos-r6-mark-ii", name: "Canon EOS R6 Mark II", brandId: "canon", categoryId: "cameras",
    summary: "Fast full-frame for action.",
    description: "A 24MP full-frame mirrorless with up to 40fps shooting and strong subject tracking. Official Canon and authorized retail only.",
    specs: [{ label: "Sensor", value: "24 MP full-frame" }, { label: "Burst", value: "40 fps" }, { label: "Video", value: "4K 60p" }, { label: "Mount", value: "Canon RF" }],
    hue: 352, currency: "USD", history: hist(2499, [2499, 2499, 2499, 2499, 2399, 2399]),
  },
  {
    id: "p-hero13", slug: "gopro-hero13-black", name: "GoPro HERO13 Black", brandId: "gopro", categoryId: "cameras",
    summary: "Flagship action camera.",
    description: "Waterproof action camera with 5.3K video, HyperSmooth stabilization and swappable lenses. Sold from GoPro with official warranty.",
    specs: [{ label: "Video", value: "5.3K 60" }, { label: "Stabilization", value: "HyperSmooth 6" }, { label: "Waterproof", value: "10 m" }],
    hue: 205, currency: "USD", history: hist(399, [399, 399, 399, 399, 399, 399]),
  },
  {
    id: "p-zv1ii", slug: "sony-zv-1-ii", name: "Sony ZV-1 II", brandId: "sony", categoryId: "cameras",
    summary: "Compact camera for creators.",
    description: "A pocket vlog camera with a wide zoom, directional mic and creator-focused controls. Verified from Sony and authorized retail.",
    specs: [{ label: "Sensor", value: "1-inch" }, { label: "Lens", value: "18–50 mm equiv." }, { label: "Video", value: "4K 30p" }],
    hue: 252, currency: "USD", history: hist(899, [899, 899, 879, 848, 848, 848]),
  },
  // ---- Computing ----
  {
    id: "p-mba-m3", slug: "apple-macbook-air-m3", name: "MacBook Air (M3, 13-inch)", brandId: "apple", categoryId: "computing",
    summary: "Thin, silent, all-day laptop.",
    description: "Apple's fanless M3 laptop with an 18-hour battery and a Liquid Retina display. Verified from Apple and authorized sellers.",
    specs: [{ label: "Chip", value: "Apple M3" }, { label: "Display", value: "13.6\" Liquid Retina" }, { label: "Battery", value: "Up to 18 h" }, { label: "Weight", value: "1.24 kg" }],
    hue: 222, currency: "USD", history: hist(1099, [1099, 1099, 1049, 999, 999, 999]),
  },
  {
    id: "p-xps13", slug: "dell-xps-13", name: "Dell XPS 13", brandId: "dell", categoryId: "computing",
    summary: "Compact premium ultrabook.",
    description: "A machined-aluminium 13-inch laptop with an edge-to-edge display. Sold from Dell's official store and authorized retail.",
    specs: [{ label: "Display", value: "13.4\" InfinityEdge" }, { label: "Build", value: "CNC aluminium" }, { label: "Weight", value: "1.19 kg" }],
    hue: 216, currency: "USD", history: hist(999, [999, 999, 979, 949, 949, 949]),
  },
  {
    id: "p-mx3s", slug: "logitech-mx-master-3s", name: "Logitech MX Master 3S", brandId: "logitech", categoryId: "computing",
    summary: "Precision productivity mouse.",
    description: "A quiet, high-precision wireless mouse with an 8K DPI sensor and fast scrolling. Official Logitech and authorized retail.",
    specs: [{ label: "Sensor", value: "8000 DPI" }, { label: "Battery", value: "Up to 70 d" }, { label: "Connect", value: "Bolt / BT" }],
    hue: 196, currency: "USD", history: hist(99.99, [99.99, 99.99, 94.99, 89.99, 89.99, 89.99]),
  },
  // ---- Audio (extra) ----
  {
    id: "p-charge5", slug: "jbl-charge-5", name: "JBL Charge 5", brandId: "jbl", categoryId: "audio",
    summary: "Rugged portable speaker + powerbank.",
    description: "A waterproof portable speaker with 20-hour playtime that also charges your phone. Official JBL and authorized retail.",
    specs: [{ label: "Rating", value: "IP67" }, { label: "Playtime", value: "20 h" }, { label: "Extras", value: "USB powerbank" }],
    hue: 22, currency: "USD", history: hist(179.95, [179.95, 179.95, 159.95, 149.95, 149.95, 149.95]),
  },
];

// Offers: same product, several official / authorized sources, multi-currency.
export const OFFERS: Offer[] = [
  // XM5
  { id: "o1", productId: "p-xm5", sourceId: "sony", price: 399, currency: "USD", url: "https://electronics.sony.com/audio/headphones/headband/p/wh1000xm5", availability: "in_stock", updatedAt: "2026-07-15", shipsTo: "US" },
  { id: "o2", productId: "p-xm5", sourceId: "amazon", price: 379, currency: "USD", url: "https://www.amazon.com/dp/B09XS7JWHH", availability: "in_stock", updatedAt: "2026-07-17", shipsTo: "US" },
  { id: "o3", productId: "p-xm5", sourceId: "noon", price: 1499, currency: "AED", url: "https://www.noon.com/uae-en/search?q=sony%20wh-1000xm5", availability: "low", updatedAt: "2026-07-16", shipsTo: "AE" },
  // Bose QC Ultra
  { id: "o4", productId: "p-qcu", sourceId: "bose", price: 429, currency: "USD", url: "https://www.bose.com/p/bose-quietcomfort-ultra-headphones", availability: "in_stock", updatedAt: "2026-07-14", shipsTo: "US" },
  { id: "o5", productId: "p-qcu", sourceId: "amazon", price: 399, currency: "USD", url: "https://www.amazon.com/dp/B0CCZ26B5V", availability: "in_stock", updatedAt: "2026-07-17", shipsTo: "US" },
  // Sonos Era 300
  { id: "o6", productId: "p-era3", sourceId: "sonos", price: 449, currency: "USD", url: "https://www.sonos.com/en-us/shop/era-300", availability: "in_stock", updatedAt: "2026-07-12", shipsTo: "US" },
  { id: "o7", productId: "p-era3", sourceId: "amazon", price: 449, currency: "USD", url: "https://www.amazon.com/dp/B0BXQXJ2QY", availability: "in_stock", updatedAt: "2026-07-16", shipsTo: "US" },
  // AirPods Pro 2
  { id: "o8", productId: "p-app2", sourceId: "apple", price: 249, currency: "USD", url: "https://www.apple.com/shop/product/MTJV3AM/A/airpods-pro", availability: "in_stock", updatedAt: "2026-07-15", shipsTo: "US" },
  { id: "o9", productId: "p-app2", sourceId: "amazon", price: 229, currency: "USD", url: "https://www.amazon.com/dp/B0D1XD1ZV3", availability: "in_stock", updatedAt: "2026-07-17", shipsTo: "US" },
  { id: "o10", productId: "p-app2", sourceId: "noon", price: 899, currency: "AED", url: "https://www.noon.com/uae-en/search?q=airpods%20pro%202", availability: "in_stock", updatedAt: "2026-07-16", shipsTo: "AE" },
  // Anker Space One
  { id: "o11", productId: "p-space1", sourceId: "anker", price: 99, currency: "USD", url: "https://www.anker.com/products/a3035", availability: "in_stock", updatedAt: "2026-07-13", shipsTo: "US" },
  { id: "o12", productId: "p-space1", sourceId: "amazon", price: 89, currency: "USD", url: "https://www.amazon.com/dp/B0CFPGD9WB", availability: "in_stock", updatedAt: "2026-07-17", shipsTo: "US" },
  // Apple Watch S10
  { id: "o13", productId: "p-aw10", sourceId: "apple", price: 399, currency: "USD", url: "https://www.apple.com/shop/buy-watch/apple-watch", availability: "in_stock", updatedAt: "2026-07-15", shipsTo: "US" },
  { id: "o14", productId: "p-aw10", sourceId: "amazon", price: 399, currency: "USD", url: "https://www.amazon.com/dp/B0DGHQ2QhL", availability: "in_stock", updatedAt: "2026-07-16", shipsTo: "US" },
  { id: "o15", productId: "p-aw10", sourceId: "noon", price: 1599, currency: "AED", url: "https://www.noon.com/uae-en/search?q=apple%20watch%20series%2010", availability: "preorder", updatedAt: "2026-07-16", shipsTo: "AE" },
  // Garmin fenix 8
  { id: "o16", productId: "p-fenix8", sourceId: "garmin", price: 999, currency: "USD", url: "https://www.garmin.com/en-US/p/fenix-8", availability: "in_stock", updatedAt: "2026-07-11", shipsTo: "US" },
  { id: "o17", productId: "p-fenix8", sourceId: "amazon", price: 949, currency: "USD", url: "https://www.amazon.com/s?k=garmin+fenix+8", availability: "low", updatedAt: "2026-07-16", shipsTo: "US" },
  // Galaxy Watch7
  { id: "o18", productId: "p-gw7", sourceId: "samsung", price: 299, currency: "USD", url: "https://www.samsung.com/us/watches/galaxy-watch7/", availability: "in_stock", updatedAt: "2026-07-14", shipsTo: "US" },
  { id: "o19", productId: "p-gw7", sourceId: "amazon", price: 279, currency: "USD", url: "https://www.amazon.com/s?k=samsung+galaxy+watch7", availability: "in_stock", updatedAt: "2026-07-17", shipsTo: "US" },
  { id: "o20", productId: "p-gw7", sourceId: "noon", price: 1099, currency: "AED", url: "https://www.noon.com/uae-en/search?q=galaxy%20watch7", availability: "in_stock", updatedAt: "2026-07-16", shipsTo: "AE" },
  // iPhone 16 Pro
  { id: "o21", productId: "p-ip16p", sourceId: "apple", price: 999, currency: "USD", url: "https://www.apple.com/shop/buy-iphone/iphone-16-pro", availability: "in_stock", updatedAt: "2026-07-15", shipsTo: "US" },
  { id: "o22", productId: "p-ip16p", sourceId: "noon", price: 4299, currency: "AED", url: "https://www.noon.com/uae-en/search?q=iphone%2016%20pro", availability: "in_stock", updatedAt: "2026-07-16", shipsTo: "AE" },
  // Galaxy S24 Ultra
  { id: "o23", productId: "p-s24u", sourceId: "samsung", price: 1299, currency: "USD", url: "https://www.samsung.com/us/smartphones/galaxy-s24-ultra/", availability: "in_stock", updatedAt: "2026-07-14", shipsTo: "US" },
  { id: "o24", productId: "p-s24u", sourceId: "amazon", price: 1199, currency: "USD", url: "https://www.amazon.com/s?k=galaxy+s24+ultra", availability: "in_stock", updatedAt: "2026-07-17", shipsTo: "US" },
  { id: "o25", productId: "p-s24u", sourceId: "noon", price: 4999, currency: "AED", url: "https://www.noon.com/uae-en/search?q=galaxy%20s24%20ultra", availability: "low", updatedAt: "2026-07-16", shipsTo: "AE" },
  // Tab S10+
  { id: "o26", productId: "p-tabs10", sourceId: "samsung", price: 999, currency: "USD", url: "https://www.samsung.com/us/tablets/galaxy-tab-s10/", availability: "in_stock", updatedAt: "2026-07-13", shipsTo: "US" },
  { id: "o27", productId: "p-tabs10", sourceId: "amazon", price: 949, currency: "USD", url: "https://www.amazon.com/s?k=galaxy+tab+s10+plus", availability: "in_stock", updatedAt: "2026-07-16", shipsTo: "US" },
  // Dyson V15
  { id: "o28", productId: "p-v15", sourceId: "dyson", price: 749, currency: "USD", url: "https://www.dyson.com/vacuum-cleaners/sticks/dyson-v15-detect", availability: "in_stock", updatedAt: "2026-07-12", shipsTo: "US" },
  { id: "o29", productId: "p-v15", sourceId: "amazon", price: 699, currency: "USD", url: "https://www.amazon.com/s?k=dyson+v15+detect", availability: "in_stock", updatedAt: "2026-07-17", shipsTo: "US" },
  // Dyson Hot+Cool
  { id: "o30", productId: "p-hotcool", sourceId: "dyson", price: 569, currency: "USD", url: "https://www.dyson.com/air-treatment/purifiers/dyson-purifier-hot-cool", availability: "in_stock", updatedAt: "2026-07-12", shipsTo: "US" },
  { id: "o31", productId: "p-hotcool", sourceId: "amazon", price: 549, currency: "USD", url: "https://www.amazon.com/s?k=dyson+purifier+hot+cool", availability: "low", updatedAt: "2026-07-16", shipsTo: "US" },
  // Anker Prime
  { id: "o32", productId: "p-prime", sourceId: "anker", price: 79.99, currency: "USD", url: "https://www.anker.com/products/a2340", availability: "in_stock", updatedAt: "2026-07-13", shipsTo: "US" },
  { id: "o33", productId: "p-prime", sourceId: "amazon", price: 69.99, currency: "USD", url: "https://www.amazon.com/s?k=anker+prime+100w", availability: "in_stock", updatedAt: "2026-07-17", shipsTo: "US" },
  // Sony A7 IV
  { id: "o34", productId: "p-a7iv", sourceId: "sony", price: 2499, currency: "USD", url: "https://electronics.sony.com/imaging/interchangeable-lens-cameras/all-interchangeable-lens-cameras/p/ilce7m4-b", availability: "in_stock", updatedAt: "2026-07-12", shipsTo: "US" },
  { id: "o35", productId: "p-a7iv", sourceId: "amazon", price: 2398, currency: "USD", url: "https://www.amazon.com/s?k=sony+a7+iv", availability: "in_stock", updatedAt: "2026-07-16", shipsTo: "US" },
  // Canon R6 II
  { id: "o36", productId: "p-r6ii", sourceId: "canon", price: 2499, currency: "USD", url: "https://www.usa.canon.com/shop/p/eos-r6-mark-ii", availability: "in_stock", updatedAt: "2026-07-11", shipsTo: "US" },
  { id: "o37", productId: "p-r6ii", sourceId: "amazon", price: 2399, currency: "USD", url: "https://www.amazon.com/s?k=canon+eos+r6+mark+ii", availability: "low", updatedAt: "2026-07-16", shipsTo: "US" },
  // GoPro HERO13
  { id: "o38", productId: "p-hero13", sourceId: "gopro", price: 399, currency: "USD", url: "https://gopro.com/en/us/shop/cameras/hero13-black/CHDHX-131-master.html", availability: "in_stock", updatedAt: "2026-07-13", shipsTo: "US" },
  { id: "o39", productId: "p-hero13", sourceId: "amazon", price: 399, currency: "USD", url: "https://www.amazon.com/s?k=gopro+hero13+black", availability: "in_stock", updatedAt: "2026-07-17", shipsTo: "US" },
  // Sony ZV-1 II
  { id: "o40", productId: "p-zv1ii", sourceId: "sony", price: 899, currency: "USD", url: "https://electronics.sony.com/imaging/point-and-shoot-cameras/p/zv1m2-b", availability: "in_stock", updatedAt: "2026-07-12", shipsTo: "US" },
  { id: "o41", productId: "p-zv1ii", sourceId: "amazon", price: 848, currency: "USD", url: "https://www.amazon.com/s?k=sony+zv-1+ii", availability: "in_stock", updatedAt: "2026-07-16", shipsTo: "US" },
  // MacBook Air M3
  { id: "o42", productId: "p-mba-m3", sourceId: "apple", price: 1099, currency: "USD", url: "https://www.apple.com/shop/buy-mac/macbook-air/13-inch-m3", availability: "in_stock", updatedAt: "2026-07-15", shipsTo: "US" },
  { id: "o43", productId: "p-mba-m3", sourceId: "amazon", price: 999, currency: "USD", url: "https://www.amazon.com/s?k=macbook+air+m3", availability: "in_stock", updatedAt: "2026-07-17", shipsTo: "US" },
  { id: "o44", productId: "p-mba-m3", sourceId: "noon", price: 4199, currency: "AED", url: "https://www.noon.com/uae-en/search?q=macbook%20air%20m3", availability: "in_stock", updatedAt: "2026-07-16", shipsTo: "AE" },
  // Dell XPS 13
  { id: "o45", productId: "p-xps13", sourceId: "dell", price: 999, currency: "USD", url: "https://www.dell.com/en-us/shop/dell-laptops/xps-13-laptop/spd/xps-13-9340-laptop", availability: "in_stock", updatedAt: "2026-07-10", shipsTo: "US" },
  { id: "o46", productId: "p-xps13", sourceId: "amazon", price: 949, currency: "USD", url: "https://www.amazon.com/s?k=dell+xps+13", availability: "in_stock", updatedAt: "2026-07-16", shipsTo: "US" },
  // Logitech MX Master 3S
  { id: "o47", productId: "p-mx3s", sourceId: "logitech", price: 99.99, currency: "USD", url: "https://www.logitech.com/en-us/products/mice/mx-master-3s.html", availability: "in_stock", updatedAt: "2026-07-13", shipsTo: "US" },
  { id: "o48", productId: "p-mx3s", sourceId: "amazon", price: 89.99, currency: "USD", url: "https://www.amazon.com/s?k=logitech+mx+master+3s", availability: "in_stock", updatedAt: "2026-07-17", shipsTo: "US" },
  // JBL Charge 5
  { id: "o49", productId: "p-charge5", sourceId: "jbl", price: 179.95, currency: "USD", url: "https://www.jbl.com/portable-speakers/JBL+CHARGE+5.html", availability: "in_stock", updatedAt: "2026-07-12", shipsTo: "US" },
  { id: "o50", productId: "p-charge5", sourceId: "amazon", price: 149.95, currency: "USD", url: "https://www.amazon.com/s?k=jbl+charge+5", availability: "in_stock", updatedAt: "2026-07-16", shipsTo: "US" },
];

// Trending order (ids) — would come from click/conversion analytics in production.
export const TRENDING_IDS = ["p-xm5", "p-ip16p", "p-mba-m3", "p-a7iv", "p-app2", "p-v15", "p-s24u", "p-aw10"];
