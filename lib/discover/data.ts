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
  { id: "lg", name: "LG", kind: "brand", official: true, domain: "lg.com", code: "LG" },
  { id: "xiaomi", name: "Xiaomi", kind: "brand", official: true, domain: "mi.com", code: "XIA" },
  { id: "asus", name: "ASUS", kind: "brand", official: true, domain: "asus.com", code: "ASU" },
  { id: "hp", name: "HP", kind: "brand", official: true, domain: "hp.com", code: "HP" },
  { id: "lenovo", name: "Lenovo", kind: "brand", official: true, domain: "lenovo.com", code: "LEN" },
  { id: "microsoft", name: "Microsoft", kind: "brand", official: true, domain: "microsoft.com", code: "MSF" },
  { id: "nintendo", name: "Nintendo", kind: "brand", official: true, domain: "nintendo.com", code: "NTD" },
  { id: "razer", name: "Razer", kind: "brand", official: true, domain: "razer.com", code: "RZR" },
  { id: "philips", name: "Philips", kind: "brand", official: true, domain: "philips.com", code: "PHI" },
  { id: "google", name: "Google", kind: "brand", official: true, domain: "store.google.com", code: "GGL" },
  { id: "oneplus", name: "OnePlus", kind: "brand", official: true, domain: "oneplus.com", code: "OPL" },
  { id: "nothing", name: "Nothing", kind: "brand", official: true, domain: "nothing.tech", code: "NTH" },
  { id: "dji", name: "DJI", kind: "brand", official: true, domain: "dji.com", code: "DJI" },
  { id: "nikon", name: "Nikon", kind: "brand", official: true, domain: "nikon.com", code: "NKN" },
  { id: "sennheiser", name: "Sennheiser", kind: "brand", official: true, domain: "sennheiser.com", code: "SEN" },
  { id: "marshall", name: "Marshall", kind: "brand", official: true, domain: "marshallheadphones.com", code: "MRS" },
  { id: "fitbit", name: "Fitbit", kind: "brand", official: true, domain: "fitbit.com", code: "FIT" },
  { id: "ninja", name: "Ninja", kind: "brand", official: true, domain: "ninjakitchen.com", code: "NNJ" },
  { id: "roborock", name: "Roborock", kind: "brand", official: true, domain: "roborock.com", code: "RBR" },
  { id: "tplink", name: "TP-Link", kind: "brand", official: true, domain: "tp-link.com", code: "TPL" },
  { id: "sandisk", name: "SanDisk", kind: "brand", official: true, domain: "sandisk.com", code: "SND" },
  { id: "keychron", name: "Keychron", kind: "brand", official: true, domain: "keychron.com", code: "KEY" },
  { id: "belkin", name: "Belkin", kind: "brand", official: true, domain: "belkin.com", code: "BLK" },
  { id: "amazon", name: "Amazon", kind: "marketplace", official: true, domain: "amazon.com", code: "AMZ" },
  { id: "noon", name: "Noon", kind: "marketplace", official: true, domain: "noon.com", code: "NOO" },
  { id: "bestbuy", name: "Best Buy", kind: "marketplace", official: true, domain: "bestbuy.com", code: "BBY" },
];

export const CATEGORIES: Category[] = [
  { id: "audio", slug: "audio", name: "Audio", blurb: "Headphones, earbuds and speakers." },
  { id: "wearables", slug: "wearables", name: "Wearables", blurb: "Smartwatches and fitness bands." },
  { id: "mobile", slug: "mobile", name: "Mobile & Tablets", blurb: "Phones and tablets, official-source only." },
  { id: "home", slug: "home", name: "Home Tech", blurb: "Cleaning, air and everyday home devices." },
  { id: "cameras", slug: "cameras", name: "Cameras", blurb: "Mirrorless, action and vlog cameras." },
  { id: "computing", slug: "computing", name: "Computing", blurb: "Laptops and desk gear, official-source only." },
  { id: "tv", slug: "tv", name: "TV & Display", blurb: "Televisions, monitors and projectors." },
  { id: "gaming", slug: "gaming", name: "Gaming", blurb: "Consoles, handhelds and play gear." },
  { id: "smarthome", slug: "smart-home", name: "Smart Home", blurb: "Lighting, security and connected living." },
  { id: "kitchen", slug: "kitchen", name: "Kitchen", blurb: "Coffee, cooking and countertop appliances." },
  { id: "fitness", slug: "fitness", name: "Fitness", blurb: "Training, recovery and health tracking." },
  { id: "networking", slug: "networking", name: "Networking & Storage", blurb: "Routers, mesh systems and drives." },
  { id: "power", slug: "power", name: "Power & Charging", blurb: "Chargers, power banks and stations." },
  { id: "beauty", slug: "beauty", name: "Beauty & Care", blurb: "Grooming, hair and personal care devices." },
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
  { id: "lg", slug: "lg", name: "LG", official: true, monogram: "LG", hue: 340, blurb: "OLED televisions, monitors and home appliances from LG.", categoryIds: ["tv", "home"] },
  { id: "xiaomi", slug: "xiaomi", name: "Xiaomi", official: true, monogram: "Xi", hue: 25, blurb: "Phones, wearables and smart home from Xiaomi's official channels.", categoryIds: ["mobile", "wearables", "smarthome"] },
  { id: "asus", slug: "asus", name: "ASUS", official: true, monogram: "As", hue: 205, blurb: "Laptops, monitors and gaming hardware from ASUS.", categoryIds: ["computing", "gaming", "tv"] },
  { id: "hp", slug: "hp", name: "HP", official: true, monogram: "HP", hue: 200, blurb: "Laptops, printers and displays from HP's official store.", categoryIds: ["computing"] },
  { id: "lenovo", slug: "lenovo", name: "Lenovo", official: true, monogram: "Le", hue: 0, blurb: "ThinkPad, Yoga and Legion, official warranty.", categoryIds: ["computing", "gaming"] },
  { id: "microsoft", slug: "microsoft", name: "Microsoft", official: true, monogram: "Ms", hue: 210, blurb: "Surface devices and Xbox from Microsoft.", categoryIds: ["computing", "gaming"] },
  { id: "nintendo", slug: "nintendo", name: "Nintendo", official: true, monogram: "Nt", hue: 355, blurb: "Switch consoles and first-party accessories.", categoryIds: ["gaming"] },
  { id: "razer", slug: "razer", name: "Razer", official: true, monogram: "Rz", hue: 110, blurb: "Gaming laptops, mice and headsets from Razer.", categoryIds: ["gaming", "computing"] },
  { id: "philips", slug: "philips", name: "Philips", official: true, monogram: "Ph", hue: 215, blurb: "Hue lighting, grooming and personal care from Philips.", categoryIds: ["smarthome", "beauty"] },
  { id: "google", slug: "google", name: "Google", official: true, monogram: "Gg", hue: 220, blurb: "Pixel phones, Nest and Fitbit from the Google Store.", categoryIds: ["mobile", "smarthome", "wearables"] },
  { id: "oneplus", slug: "oneplus", name: "OnePlus", official: true, monogram: "1+", hue: 0, blurb: "Flagship phones and audio from OnePlus.", categoryIds: ["mobile", "audio"] },
  { id: "nothing", slug: "nothing", name: "Nothing", official: true, monogram: "No", hue: 0, blurb: "Transparent-design phones and earbuds from Nothing.", categoryIds: ["mobile", "audio"] },
  { id: "dji", slug: "dji", name: "DJI", official: true, monogram: "DJ", hue: 195, blurb: "Drones, gimbals and action cameras from DJI.", categoryIds: ["cameras"] },
  { id: "nikon", slug: "nikon", name: "Nikon", official: true, monogram: "Nk", hue: 45, blurb: "Mirrorless cameras and lenses, official Nikon.", categoryIds: ["cameras"] },
  { id: "sennheiser", slug: "sennheiser", name: "Sennheiser", official: true, monogram: "Se", hue: 220, blurb: "Reference headphones and earbuds from Sennheiser.", categoryIds: ["audio"] },
  { id: "marshall", slug: "marshall", name: "Marshall", official: true, monogram: "Mr", hue: 30, blurb: "Amp-styled speakers and headphones from Marshall.", categoryIds: ["audio"] },
  { id: "fitbit", slug: "fitbit", name: "Fitbit", official: true, monogram: "Fb", hue: 175, blurb: "Health and activity trackers, official Fitbit.", categoryIds: ["wearables", "fitness"] },
  { id: "ninja", slug: "ninja", name: "Ninja", official: true, monogram: "Nj", hue: 145, blurb: "Air fryers, blenders and countertop cooking.", categoryIds: ["kitchen"] },
  { id: "roborock", slug: "roborock", name: "Roborock", official: true, monogram: "Rb", hue: 190, blurb: "Robot vacuums and mops, official Roborock.", categoryIds: ["home", "smarthome"] },
  { id: "tplink", slug: "tp-link", name: "TP-Link", official: true, monogram: "TP", hue: 185, blurb: "Routers, mesh Wi-Fi and smart plugs.", categoryIds: ["networking", "smarthome"] },
  { id: "sandisk", slug: "sandisk", name: "SanDisk", official: true, monogram: "Sd", hue: 5, blurb: "Portable SSDs and memory cards, official SanDisk.", categoryIds: ["networking", "computing"] },
  { id: "keychron", slug: "keychron", name: "Keychron", official: true, monogram: "Kc", hue: 235, blurb: "Mechanical keyboards, official Keychron.", categoryIds: ["computing"] },
  { id: "belkin", slug: "belkin", name: "Belkin", official: true, monogram: "Bk", hue: 200, blurb: "Chargers, docks and cables, official Belkin.", categoryIds: ["power"] },
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

  // ---- Audio ----
  {
    id: "p-momentum4", slug: "sennheiser-momentum-4", name: "Sennheiser Momentum 4 Wireless", brandId: "sennheiser", categoryId: "audio",
    summary: "60-hour battery with reference tuning.",
    description: "Sennheiser's flagship wireless over-ears, tuned for neutral reproduction with adaptive noise cancelling and a 60-hour battery.",
    specs: [{ label: "Type", value: "Over-ear" }, { label: "Battery", value: "60 h" }, { label: "Codecs", value: "aptX Adaptive" }, { label: "Weight", value: "293 g" }],
    hue: 224, currency: "USD", history: hist(349.95, [379.95, 349.95, 329.95, 299.95, 299.95, 279.95]),
  },
  {
    id: "p-marshall-stanmore", slug: "marshall-stanmore-iii", name: "Marshall Stanmore III", brandId: "marshall", categoryId: "audio",
    summary: "Amp-styled stereo speaker for the room.",
    description: "A bookshelf-sized Bluetooth speaker with Marshall's signature grille and analogue controls, tuned for full-room stereo.",
    specs: [{ label: "Power", value: "50 W" }, { label: "Bluetooth", value: "5.2 LE" }, { label: "Controls", value: "Analogue knobs" }],
    hue: 32, currency: "USD", history: hist(379.99, [379.99, 379.99, 379.99, 349.99, 329.99, 329.99]),
  },
  {
    id: "p-nothing-ear", slug: "nothing-ear-a", name: "Nothing Ear (a)", brandId: "nothing", categoryId: "audio",
    summary: "Transparent-design ANC earbuds.",
    description: "Lightweight earbuds with 45 dB adaptive noise cancelling and Nothing's transparent industrial design.",
    specs: [{ label: "ANC", value: "45 dB adaptive" }, { label: "Battery", value: "42.5 h with case" }, { label: "Driver", value: "11 mm" }],
    hue: 355, currency: "USD", history: hist(99, [99, 99, 99, 89, 89, 79]),
  },
  {
    id: "p-oneplus-buds3", slug: "oneplus-buds-3-pro", name: "OnePlus Buds 3 Pro", brandId: "oneplus", categoryId: "audio",
    summary: "Dual-driver earbuds with 50 dB ANC.",
    description: "Dual-driver earbuds with adaptive noise cancelling up to 50 dB, spatial audio and fast pairing across OnePlus devices.",
    specs: [{ label: "ANC", value: "50 dB" }, { label: "Drivers", value: "Dual (11 + 6 mm)" }, { label: "Battery", value: "43 h with case" }],
    hue: 8, currency: "USD", history: hist(179.99, [179.99, 179.99, 169.99, 159.99, 149.99, 149.99]),
  },

  // ---- TV & Display ----
  {
    id: "p-lg-c4", slug: "lg-oled-evo-c4-55", name: "LG OLED evo C4 55\"", brandId: "lg", categoryId: "tv",
    summary: "144 Hz OLED with per-pixel contrast.",
    description: "LG's mainstream OLED with the α9 Gen7 processor, 144 Hz refresh for gaming and per-pixel light control for absolute blacks.",
    specs: [{ label: "Panel", value: "OLED evo" }, { label: "Size", value: "55 in" }, { label: "Refresh", value: "144 Hz" }, { label: "HDMI", value: "4 × HDMI 2.1" }],
    hue: 340, currency: "USD", history: hist(1499, [1699, 1599, 1499, 1399, 1299, 1296]),
  },
  {
    id: "p-samsung-s90d", slug: "samsung-oled-s90d-65", name: "Samsung OLED S90D 65\"", brandId: "samsung", categoryId: "tv",
    summary: "QD-OLED brightness with 144 Hz gaming.",
    description: "Quantum-dot OLED panel with the NQ4 AI Gen2 processor, 144 Hz refresh and Motion Xcelerator for console play.",
    specs: [{ label: "Panel", value: "QD-OLED" }, { label: "Size", value: "65 in" }, { label: "Refresh", value: "144 Hz" }, { label: "HDR", value: "HDR10+" }],
    hue: 212, currency: "USD", history: hist(2299, [2599, 2499, 2299, 2099, 1899, 1799]),
  },
  {
    id: "p-asus-pg27", slug: "asus-rog-swift-oled-pg27aqdm", name: "ASUS ROG Swift OLED PG27AQDM", brandId: "asus", categoryId: "tv",
    summary: "240 Hz 1440p OLED gaming monitor.",
    description: "A 26.5-inch OLED gaming monitor running 1440p at 240 Hz with a 0.03 ms response and a custom heatsink.",
    specs: [{ label: "Size", value: "26.5 in" }, { label: "Resolution", value: "2560 × 1440" }, { label: "Refresh", value: "240 Hz" }, { label: "Response", value: "0.03 ms" }],
    hue: 205, currency: "USD", history: hist(899, [999, 949, 899, 849, 799, 799]),
  },

  // ---- Gaming ----
  {
    id: "p-switch-oled", slug: "nintendo-switch-oled", name: "Nintendo Switch — OLED Model", brandId: "nintendo", categoryId: "gaming",
    summary: "7-inch OLED handheld and dock.",
    description: "The OLED revision of the Switch with a 7-inch screen, wide adjustable stand and 64 GB of internal storage.",
    specs: [{ label: "Screen", value: "7 in OLED" }, { label: "Storage", value: "64 GB" }, { label: "Battery", value: "4.5–9 h" }],
    hue: 355, currency: "USD", history: hist(349.99, [349.99, 349.99, 349.99, 349.99, 339.99, 329.99]),
  },
  {
    id: "p-xbox-x", slug: "xbox-series-x", name: "Xbox Series X", brandId: "microsoft", categoryId: "gaming",
    summary: "4K console with 1 TB SSD.",
    description: "Microsoft's flagship console targeting 4K at up to 120 fps, with a 1 TB custom NVMe SSD and Quick Resume.",
    specs: [{ label: "Target", value: "4K / 120 fps" }, { label: "Storage", value: "1 TB NVMe" }, { label: "Optical", value: "4K UHD Blu-ray" }],
    hue: 128, currency: "USD", history: hist(499.99, [499.99, 499.99, 499.99, 469.99, 449.99, 449.99]),
  },
  {
    id: "p-razer-basilisk", slug: "razer-basilisk-v3-pro", name: "Razer Basilisk V3 Pro", brandId: "razer", categoryId: "gaming",
    summary: "Wireless gaming mouse, 30 K sensor.",
    description: "An 11-button wireless gaming mouse with a 30 000 DPI optical sensor, optical switches and a tilt-scroll wheel.",
    specs: [{ label: "Sensor", value: "30 000 DPI" }, { label: "Buttons", value: "11 programmable" }, { label: "Battery", value: "90 h" }],
    hue: 112, currency: "USD", history: hist(159.99, [159.99, 159.99, 149.99, 139.99, 129.99, 129.99]),
  },

  // ---- Smart Home ----
  {
    id: "p-hue-starter", slug: "philips-hue-white-color-starter", name: "Philips Hue White & Color Starter Kit", brandId: "philips", categoryId: "smarthome",
    summary: "Bridge plus three colour bulbs.",
    description: "The Hue starter kit: a bridge and three colour-capable bulbs covering 16 million colours, with scenes and schedules.",
    specs: [{ label: "Bulbs", value: "3 × A19" }, { label: "Colours", value: "16 million" }, { label: "Hub", value: "Hue Bridge included" }],
    hue: 218, currency: "USD", history: hist(199.99, [199.99, 199.99, 189.99, 169.99, 159.99, 159.99]),
  },
  {
    id: "p-nest-cam", slug: "google-nest-cam-battery", name: "Google Nest Cam (Battery)", brandId: "google", categoryId: "smarthome",
    summary: "Wire-free camera with on-device AI.",
    description: "A weatherproof battery camera that recognises people, animals and vehicles on-device, with three hours of free event history.",
    specs: [{ label: "Video", value: "1080p HDR" }, { label: "Power", value: "Battery or wired" }, { label: "Rating", value: "IP54" }],
    hue: 222, currency: "USD", history: hist(179.99, [179.99, 179.99, 169.99, 159.99, 149.99, 149.99]),
  },
  {
    id: "p-roborock-s8", slug: "roborock-s8-max-ultra", name: "Roborock S8 MaxV Ultra", brandId: "roborock", categoryId: "smarthome",
    summary: "Self-washing robot vacuum and mop.",
    description: "A robot vacuum and mop with 10 000 Pa suction, an extending side brush and a dock that washes and dries the mop.",
    specs: [{ label: "Suction", value: "10 000 Pa" }, { label: "Dock", value: "Wash, dry, refill" }, { label: "Navigation", value: "LiDAR + binocular" }],
    hue: 192, currency: "USD", history: hist(1799.99, [1799.99, 1699.99, 1599.99, 1499.99, 1399.99, 1399.99]),
  },

  // ---- Kitchen ----
  {
    id: "p-ninja-af", slug: "ninja-foodi-dual-zone", name: "Ninja Foodi 6-in-1 DualZone Air Fryer", brandId: "ninja", categoryId: "kitchen",
    summary: "Two baskets, two foods, one finish time.",
    description: "A dual-basket air fryer whose Smart Finish setting times two different foods to finish together across six cooking modes.",
    specs: [{ label: "Capacity", value: "9.5 L total" }, { label: "Baskets", value: "2 independent" }, { label: "Modes", value: "6" }],
    hue: 148, currency: "USD", history: hist(229.99, [229.99, 219.99, 199.99, 179.99, 169.99, 169.99]),
  },
  {
    id: "p-ninja-blender", slug: "ninja-detect-power-blender", name: "Ninja Detect Power Blender Pro", brandId: "ninja", categoryId: "kitchen",
    summary: "Senses contents and adjusts the blend.",
    description: "A 1800-peak-watt blender that detects the contents and adjusts blend time and power automatically, with a 72 oz pitcher.",
    specs: [{ label: "Power", value: "1800 W peak" }, { label: "Pitcher", value: "72 oz" }, { label: "Programs", value: "5 Auto-iQ" }],
    hue: 142, currency: "USD", history: hist(199.99, [199.99, 189.99, 179.99, 169.99, 159.99, 159.99]),
  },

  // ---- Fitness ----
  {
    id: "p-charge6", slug: "fitbit-charge-6", name: "Fitbit Charge 6", brandId: "fitbit", categoryId: "fitness",
    summary: "ECG, GPS and Google apps on the wrist.",
    description: "A tracker with built-in GPS, ECG and EDA sensors, plus Google Maps and Wallet, and a week of battery.",
    specs: [{ label: "Battery", value: "7 days" }, { label: "Sensors", value: "ECG, EDA, SpO2" }, { label: "GPS", value: "Built-in" }],
    hue: 178, currency: "USD", history: hist(159.95, [159.95, 149.95, 139.95, 129.95, 119.95, 99.95]),
  },
  {
    id: "p-fenix8", slug: "garmin-fenix-8", name: "Garmin fēnix 8", brandId: "garmin", categoryId: "fitness",
    summary: "AMOLED multisport watch with dive support.",
    description: "Garmin's flagship multisport watch with an AMOLED display, built-in speaker and mic, leakproof design and dive computer modes.",
    specs: [{ label: "Display", value: "AMOLED" }, { label: "Battery", value: "Up to 16 days" }, { label: "Water", value: "10 ATM, dive-rated" }],
    hue: 158, currency: "USD", history: hist(999.99, [1099.99, 1099.99, 1049.99, 999.99, 999.99, 949.99]),
  },

  // ---- Networking & Storage ----
  {
    id: "p-deco-be85", slug: "tp-link-deco-be85", name: "TP-Link Deco BE85 (2-pack)", brandId: "tplink", categoryId: "networking",
    summary: "Wi-Fi 7 mesh with 10 G ports.",
    description: "A tri-band Wi-Fi 7 mesh system with 10 Gbps ports and coverage up to 8 400 sq ft across two units.",
    specs: [{ label: "Standard", value: "Wi-Fi 7 (BE22000)" }, { label: "Ports", value: "2 × 10 G per unit" }, { label: "Coverage", value: "8 400 sq ft" }],
    hue: 188, currency: "USD", history: hist(699.99, [699.99, 699.99, 649.99, 599.99, 549.99, 549.99]),
  },
  {
    id: "p-sandisk-t5", slug: "sandisk-extreme-pro-portable-ssd", name: "SanDisk Extreme PRO Portable SSD 2 TB", brandId: "sandisk", categoryId: "networking",
    summary: "2000 MB/s pocket SSD, IP65.",
    description: "A rugged USB 3.2 Gen 2×2 portable SSD reading up to 2000 MB/s, with IP65 dust and water resistance.",
    specs: [{ label: "Capacity", value: "2 TB" }, { label: "Read", value: "2000 MB/s" }, { label: "Rating", value: "IP65" }],
    hue: 8, currency: "USD", history: hist(299.99, [299.99, 279.99, 259.99, 239.99, 219.99, 199.99]),
  },

  // ---- Power & Charging ----
  {
    id: "p-anker-737", slug: "anker-737-power-bank", name: "Anker 737 Power Bank (PowerCore 24K)", brandId: "anker", categoryId: "power",
    summary: "24 000 mAh with a 140 W output.",
    description: "A 24 000 mAh bank delivering up to 140 W over USB-C, with a smart display showing power flow and temperature.",
    specs: [{ label: "Capacity", value: "24 000 mAh" }, { label: "Output", value: "140 W max" }, { label: "Display", value: "Smart digital" }],
    hue: 200, currency: "USD", history: hist(149.99, [149.99, 139.99, 129.99, 119.99, 109.99, 99.99]),
  },
  {
    id: "p-belkin-3in1", slug: "belkin-boostcharge-pro-3-in-1", name: "Belkin BoostCharge Pro 3-in-1 (Qi2)", brandId: "belkin", categoryId: "power",
    summary: "Qi2 15 W stand for phone, watch and buds.",
    description: "A magnetic 3-in-1 charger delivering Qi2 15 W to the phone while charging a watch and earbuds from one base.",
    specs: [{ label: "Standard", value: "Qi2 15 W" }, { label: "Devices", value: "3 at once" }, { label: "Watch", value: "Fast charge" }],
    hue: 202, currency: "USD", history: hist(149.99, [149.99, 149.99, 139.99, 129.99, 119.99, 119.99]),
  },

  // ---- Beauty & Care ----
  {
    id: "p-airwrap", slug: "dyson-airwrap-i-d", name: "Dyson Airwrap i.d.", brandId: "dyson", categoryId: "beauty",
    summary: "Curls and dries without extreme heat.",
    description: "Dyson's multi-styler using the Coanda effect to curl, wave and smooth with heat controlled to protect the hair.",
    specs: [{ label: "Heat control", value: "Measured 40× / sec" }, { label: "Attachments", value: "6 in box" }, { label: "Modes", value: "App-curated" }],
    hue: 300, currency: "USD", history: hist(599.99, [599.99, 599.99, 599.99, 549.99, 549.99, 529.99]),
  },
  {
    id: "p-philips-9000", slug: "philips-norelco-shaver-9000", name: "Philips Norelco Shaver 9000 Prestige", brandId: "philips", categoryId: "beauty",
    summary: "Adaptive rotary shave, wet or dry.",
    description: "A rotary shaver that reads beard density 500 times per second and adjusts power, usable wet or dry with a cleaning pod.",
    specs: [{ label: "Sensing", value: "500× / sec" }, { label: "Use", value: "Wet & dry" }, { label: "Battery", value: "60 min" }],
    hue: 216, currency: "USD", history: hist(399.99, [399.99, 379.99, 349.99, 329.99, 299.99, 279.99]),
  },

  // ---- Mobile ----
  {
    id: "p-pixel9p", slug: "google-pixel-9-pro", name: "Google Pixel 9 Pro", brandId: "google", categoryId: "mobile",
    summary: "Tensor G4 with a triple 48 MP-class camera.",
    description: "Google's compact pro phone with the Tensor G4, a 6.3-inch Super Actua display and seven years of OS updates.",
    specs: [{ label: "Chip", value: "Tensor G4" }, { label: "Display", value: "6.3\" Super Actua" }, { label: "Updates", value: "7 years" }],
    hue: 226, currency: "USD", history: hist(999, [999, 999, 949, 899, 849, 799]),
  },
  {
    id: "p-oneplus12", slug: "oneplus-12", name: "OnePlus 12", brandId: "oneplus", categoryId: "mobile",
    summary: "Snapdragon 8 Gen 3 with 100 W charging.",
    description: "A flagship with the Snapdragon 8 Gen 3, a 2K 120 Hz ProXDR display and 100 W wired charging.",
    specs: [{ label: "Chip", value: "Snapdragon 8 Gen 3" }, { label: "Display", value: "6.82\" 2K 120 Hz" }, { label: "Charging", value: "100 W wired" }],
    hue: 4, currency: "USD", history: hist(799.99, [799.99, 799.99, 749.99, 699.99, 649.99, 649.99]),
  },
  {
    id: "p-xiaomi14", slug: "xiaomi-14-ultra", name: "Xiaomi 14 Ultra", brandId: "xiaomi", categoryId: "mobile",
    summary: "Leica quad camera with variable aperture.",
    description: "A camera-first flagship co-engineered with Leica, with a 1-inch main sensor and a stepless variable aperture.",
    specs: [{ label: "Main sensor", value: "1-inch LYT-900" }, { label: "Aperture", value: "f/1.63–f/4.0" }, { label: "Optics", value: "Leica Summilux" }],
    hue: 28, currency: "USD", history: hist(1299, [1399, 1349, 1299, 1249, 1199, 1149]),
  },

  // ---- Computing ----
  {
    id: "p-xps14", slug: "dell-xps-14", name: "Dell XPS 14", brandId: "dell", categoryId: "computing",
    summary: "Core Ultra laptop with an OLED option.",
    description: "A 14.5-inch machined-aluminium laptop with Intel Core Ultra, an optional 3.2K OLED touch display and RTX graphics.",
    specs: [{ label: "Chip", value: "Intel Core Ultra 7" }, { label: "Display", value: "14.5\" 3.2K OLED" }, { label: "Graphics", value: "RTX 4050" }],
    hue: 218, currency: "USD", history: hist(1899, [1999, 1949, 1899, 1799, 1699, 1649]),
  },
  {
    id: "p-thinkpad-x1", slug: "lenovo-thinkpad-x1-carbon-g12", name: "Lenovo ThinkPad X1 Carbon Gen 12", brandId: "lenovo", categoryId: "computing",
    summary: "Sub-kilo business laptop, Core Ultra.",
    description: "A 14-inch carbon-fibre business laptop under 1.1 kg, with Core Ultra, a 2.8K OLED option and MIL-STD durability.",
    specs: [{ label: "Weight", value: "1.09 kg" }, { label: "Chip", value: "Intel Core Ultra 7" }, { label: "Display", value: "14\" 2.8K OLED" }],
    hue: 358, currency: "USD", history: hist(2149, [2299, 2249, 2149, 1999, 1899, 1849]),
  },
  {
    id: "p-surface-l6", slug: "microsoft-surface-laptop-6", name: "Microsoft Surface Laptop 6", brandId: "microsoft", categoryId: "computing",
    summary: "Touch laptop with a repairable design.",
    description: "A touchscreen laptop with Core Ultra, a 120 Hz PixelSense display and a design built for serviceability.",
    specs: [{ label: "Chip", value: "Intel Core Ultra 5" }, { label: "Display", value: "13.5\" PixelSense 120 Hz" }, { label: "Ports", value: "2 × USB4" }],
    hue: 212, currency: "USD", history: hist(1199.99, [1199.99, 1199.99, 1149.99, 1099.99, 1049.99, 999.99]),
  },
  {
    id: "p-keychron-q1", slug: "keychron-q1-pro", name: "Keychron Q1 Pro", brandId: "keychron", categoryId: "computing",
    summary: "Gasket-mounted wireless mechanical board.",
    description: "A 75% aluminium mechanical keyboard with a gasket mount, hot-swappable switches, QMK/VIA support and Bluetooth.",
    specs: [{ label: "Layout", value: "75%" }, { label: "Mount", value: "Gasket" }, { label: "Firmware", value: "QMK / VIA" }, { label: "Wireless", value: "Bluetooth 5.1" }],
    hue: 238, currency: "USD", history: hist(199, [199, 199, 189, 179, 179, 174]),
  },

  // ---- Cameras ----
  {
    id: "p-dji-mini4", slug: "dji-mini-4-pro", name: "DJI Mini 4 Pro", brandId: "dji", categoryId: "cameras",
    summary: "Sub-249 g drone with omnidirectional sensing.",
    description: "A sub-249 g drone shooting 4K/60 HDR with omnidirectional obstacle sensing and 34 minutes of flight.",
    specs: [{ label: "Weight", value: "< 249 g" }, { label: "Video", value: "4K/60 HDR" }, { label: "Flight", value: "34 min" }, { label: "Sensing", value: "Omnidirectional" }],
    hue: 196, currency: "USD", history: hist(759, [759, 759, 759, 729, 699, 699]),
  },
  {
    id: "p-nikon-z6iii", slug: "nikon-z6-iii", name: "Nikon Z6 III", brandId: "nikon", categoryId: "cameras",
    summary: "Partially-stacked sensor, 6K RAW.",
    description: "A full-frame mirrorless with the first partially-stacked CMOS sensor, 6K/60 internal RAW and 20 fps bursts.",
    specs: [{ label: "Sensor", value: "24.5 MP partially-stacked" }, { label: "Video", value: "6K/60 N-RAW" }, { label: "Burst", value: "20 fps" }],
    hue: 48, currency: "USD", history: hist(2499.95, [2499.95, 2499.95, 2499.95, 2399.95, 2299.95, 2296.95]),
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

  // Sennheiser Momentum 4
  { id: "o51", productId: "p-momentum4", sourceId: "sennheiser", price: 299.95, currency: "USD", url: "https://www.sennheiser-hearing.com/en-US/p/momentum-4-wireless/", availability: "in_stock", updatedAt: "2026-07-18", shipsTo: "US" },
  { id: "o52", productId: "p-momentum4", sourceId: "amazon", price: 279.95, currency: "USD", url: "https://www.amazon.com/s?k=sennheiser+momentum+4", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },
  // Marshall Stanmore III
  { id: "o53", productId: "p-marshall-stanmore", sourceId: "marshall", price: 379.99, currency: "USD", url: "https://www.marshallheadphones.com/us/en/stanmore-iii.html", availability: "in_stock", updatedAt: "2026-07-17", shipsTo: "US" },
  { id: "o54", productId: "p-marshall-stanmore", sourceId: "amazon", price: 329.99, currency: "USD", url: "https://www.amazon.com/s?k=marshall+stanmore+iii", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },
  // Nothing Ear (a)
  { id: "o55", productId: "p-nothing-ear", sourceId: "nothing", price: 99, currency: "USD", url: "https://us.nothing.tech/products/ear-a", availability: "in_stock", updatedAt: "2026-07-16", shipsTo: "US" },
  { id: "o56", productId: "p-nothing-ear", sourceId: "amazon", price: 79, currency: "USD", url: "https://www.amazon.com/s?k=nothing+ear+a", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },
  // OnePlus Buds 3 Pro
  { id: "o57", productId: "p-oneplus-buds3", sourceId: "oneplus", price: 179.99, currency: "USD", url: "https://www.oneplus.com/us/oneplus-buds-3", availability: "in_stock", updatedAt: "2026-07-15", shipsTo: "US" },
  { id: "o58", productId: "p-oneplus-buds3", sourceId: "amazon", price: 149.99, currency: "USD", url: "https://www.amazon.com/s?k=oneplus+buds+3+pro", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },

  // LG OLED evo C4 55"
  { id: "o59", productId: "p-lg-c4", sourceId: "lg", price: 1399, currency: "USD", url: "https://www.lg.com/us/tvs/lg-oled55c4pua-oled-4k-tv", availability: "in_stock", updatedAt: "2026-07-18", shipsTo: "US" },
  { id: "o60", productId: "p-lg-c4", sourceId: "bestbuy", price: 1296, currency: "USD", url: "https://www.bestbuy.com/site/searchpage.jsp?st=lg+c4+oled+55", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },
  { id: "o61", productId: "p-lg-c4", sourceId: "amazon", price: 1299, currency: "USD", url: "https://www.amazon.com/s?k=lg+oled+c4+55", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },
  // Samsung S90D 65"
  { id: "o62", productId: "p-samsung-s90d", sourceId: "samsung", price: 1899, currency: "USD", url: "https://www.samsung.com/us/televisions-home-theater/tvs/oled-tvs/", availability: "in_stock", updatedAt: "2026-07-17", shipsTo: "US" },
  { id: "o63", productId: "p-samsung-s90d", sourceId: "bestbuy", price: 1799, currency: "USD", url: "https://www.bestbuy.com/site/searchpage.jsp?st=samsung+s90d+65", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },
  // ASUS ROG Swift OLED
  { id: "o64", productId: "p-asus-pg27", sourceId: "asus", price: 899, currency: "USD", url: "https://rog.asus.com/monitors/27-to-31-5-inches/rog-swift-oled-pg27aqdm/", availability: "in_stock", updatedAt: "2026-07-14", shipsTo: "US" },
  { id: "o65", productId: "p-asus-pg27", sourceId: "amazon", price: 799, currency: "USD", url: "https://www.amazon.com/s?k=asus+rog+swift+oled+pg27aqdm", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },

  // Nintendo Switch OLED
  { id: "o66", productId: "p-switch-oled", sourceId: "nintendo", price: 349.99, currency: "USD", url: "https://www.nintendo.com/us/store/products/nintendo-switch-oled-model-white-set/", availability: "in_stock", updatedAt: "2026-07-18", shipsTo: "US" },
  { id: "o67", productId: "p-switch-oled", sourceId: "amazon", price: 329.99, currency: "USD", url: "https://www.amazon.com/s?k=nintendo+switch+oled", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },
  // Xbox Series X
  { id: "o68", productId: "p-xbox-x", sourceId: "microsoft", price: 499.99, currency: "USD", url: "https://www.xbox.com/en-US/consoles/xbox-series-x", availability: "in_stock", updatedAt: "2026-07-16", shipsTo: "US" },
  { id: "o69", productId: "p-xbox-x", sourceId: "bestbuy", price: 449.99, currency: "USD", url: "https://www.bestbuy.com/site/searchpage.jsp?st=xbox+series+x", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },
  // Razer Basilisk V3 Pro
  { id: "o70", productId: "p-razer-basilisk", sourceId: "razer", price: 159.99, currency: "USD", url: "https://www.razer.com/gaming-mice/razer-basilisk-v3-pro", availability: "in_stock", updatedAt: "2026-07-15", shipsTo: "US" },
  { id: "o71", productId: "p-razer-basilisk", sourceId: "amazon", price: 129.99, currency: "USD", url: "https://www.amazon.com/s?k=razer+basilisk+v3+pro", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },

  // Philips Hue starter kit
  { id: "o72", productId: "p-hue-starter", sourceId: "philips", price: 179.99, currency: "USD", url: "https://www.philips-hue.com/en-us/p/hue-white-and-color-ambiance-starter-kit/", availability: "in_stock", updatedAt: "2026-07-17", shipsTo: "US" },
  { id: "o73", productId: "p-hue-starter", sourceId: "amazon", price: 159.99, currency: "USD", url: "https://www.amazon.com/s?k=philips+hue+starter+kit", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },
  // Google Nest Cam
  { id: "o74", productId: "p-nest-cam", sourceId: "google", price: 179.99, currency: "USD", url: "https://store.google.com/product/nest_cam_battery", availability: "in_stock", updatedAt: "2026-07-16", shipsTo: "US" },
  { id: "o75", productId: "p-nest-cam", sourceId: "amazon", price: 149.99, currency: "USD", url: "https://www.amazon.com/s?k=google+nest+cam+battery", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },
  // Roborock S8 MaxV Ultra
  { id: "o76", productId: "p-roborock-s8", sourceId: "roborock", price: 1599.99, currency: "USD", url: "https://us.roborock.com/products/roborock-s8-maxv-ultra", availability: "in_stock", updatedAt: "2026-07-15", shipsTo: "US" },
  { id: "o77", productId: "p-roborock-s8", sourceId: "amazon", price: 1399.99, currency: "USD", url: "https://www.amazon.com/s?k=roborock+s8+maxv+ultra", availability: "low", updatedAt: "2026-07-19", shipsTo: "US" },

  // Ninja air fryer
  { id: "o78", productId: "p-ninja-af", sourceId: "ninja", price: 199.99, currency: "USD", url: "https://www.ninjakitchen.com/products/ninja-foodi-6-in-1-8-qt-2-basket-air-fryer", availability: "in_stock", updatedAt: "2026-07-14", shipsTo: "US" },
  { id: "o79", productId: "p-ninja-af", sourceId: "amazon", price: 169.99, currency: "USD", url: "https://www.amazon.com/s?k=ninja+foodi+dualzone+air+fryer", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },
  // Ninja blender
  { id: "o80", productId: "p-ninja-blender", sourceId: "ninja", price: 179.99, currency: "USD", url: "https://www.ninjakitchen.com/products/ninja-detect-power-blender-pro", availability: "in_stock", updatedAt: "2026-07-14", shipsTo: "US" },
  { id: "o81", productId: "p-ninja-blender", sourceId: "amazon", price: 159.99, currency: "USD", url: "https://www.amazon.com/s?k=ninja+detect+power+blender+pro", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },

  // Fitbit Charge 6
  { id: "o82", productId: "p-charge6", sourceId: "google", price: 159.95, currency: "USD", url: "https://store.google.com/product/fitbit_charge_6", availability: "in_stock", updatedAt: "2026-07-16", shipsTo: "US" },
  { id: "o83", productId: "p-charge6", sourceId: "amazon", price: 99.95, currency: "USD", url: "https://www.amazon.com/s?k=fitbit+charge+6", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },
  // Garmin fenix 8
  { id: "o84", productId: "p-fenix8", sourceId: "garmin", price: 999.99, currency: "USD", url: "https://www.garmin.com/en-US/p/fenix-8", availability: "in_stock", updatedAt: "2026-07-17", shipsTo: "US" },
  { id: "o85", productId: "p-fenix8", sourceId: "amazon", price: 949.99, currency: "USD", url: "https://www.amazon.com/s?k=garmin+fenix+8", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },

  // TP-Link Deco BE85
  { id: "o86", productId: "p-deco-be85", sourceId: "tplink", price: 649.99, currency: "USD", url: "https://www.tp-link.com/us/home-networking/deco/deco-be85/", availability: "in_stock", updatedAt: "2026-07-15", shipsTo: "US" },
  { id: "o87", productId: "p-deco-be85", sourceId: "amazon", price: 549.99, currency: "USD", url: "https://www.amazon.com/s?k=tp-link+deco+be85", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },
  // SanDisk Extreme PRO SSD
  { id: "o88", productId: "p-sandisk-t5", sourceId: "sandisk", price: 249.99, currency: "USD", url: "https://shop.sandisk.com/products/portable-ssd/sandisk-extreme-pro-usb-3-2-ssd", availability: "in_stock", updatedAt: "2026-07-16", shipsTo: "US" },
  { id: "o89", productId: "p-sandisk-t5", sourceId: "amazon", price: 199.99, currency: "USD", url: "https://www.amazon.com/s?k=sandisk+extreme+pro+portable+ssd+2tb", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },

  // Anker 737
  { id: "o90", productId: "p-anker-737", sourceId: "anker", price: 149.99, currency: "USD", url: "https://www.anker.com/products/a1289", availability: "in_stock", updatedAt: "2026-07-15", shipsTo: "US" },
  { id: "o91", productId: "p-anker-737", sourceId: "amazon", price: 99.99, currency: "USD", url: "https://www.amazon.com/s?k=anker+737+power+bank", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },
  // Belkin 3-in-1
  { id: "o92", productId: "p-belkin-3in1", sourceId: "belkin", price: 149.99, currency: "USD", url: "https://www.belkin.com/boostcharge-pro-3-in-1-magnetic-wireless-charging-pad-with-qi2-15w/", availability: "in_stock", updatedAt: "2026-07-16", shipsTo: "US" },
  { id: "o93", productId: "p-belkin-3in1", sourceId: "amazon", price: 119.99, currency: "USD", url: "https://www.amazon.com/s?k=belkin+boostcharge+pro+3+in+1+qi2", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },

  // Dyson Airwrap i.d.
  { id: "o94", productId: "p-airwrap", sourceId: "dyson", price: 599.99, currency: "USD", url: "https://www.dyson.com/hair-care/hair-stylers/airwrap", availability: "in_stock", updatedAt: "2026-07-17", shipsTo: "US" },
  { id: "o95", productId: "p-airwrap", sourceId: "amazon", price: 529.99, currency: "USD", url: "https://www.amazon.com/s?k=dyson+airwrap", availability: "low", updatedAt: "2026-07-19", shipsTo: "US" },
  // Philips Shaver 9000
  { id: "o96", productId: "p-philips-9000", sourceId: "philips", price: 329.99, currency: "USD", url: "https://www.usa.philips.com/c-m-pe/shavers", availability: "in_stock", updatedAt: "2026-07-15", shipsTo: "US" },
  { id: "o97", productId: "p-philips-9000", sourceId: "amazon", price: 279.99, currency: "USD", url: "https://www.amazon.com/s?k=philips+norelco+9000+prestige", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },

  // Pixel 9 Pro
  { id: "o98", productId: "p-pixel9p", sourceId: "google", price: 999, currency: "USD", url: "https://store.google.com/product/pixel_9_pro", availability: "in_stock", updatedAt: "2026-07-18", shipsTo: "US" },
  { id: "o99", productId: "p-pixel9p", sourceId: "amazon", price: 799, currency: "USD", url: "https://www.amazon.com/s?k=google+pixel+9+pro", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },
  // OnePlus 12
  { id: "o100", productId: "p-oneplus12", sourceId: "oneplus", price: 799.99, currency: "USD", url: "https://www.oneplus.com/us/oneplus-12", availability: "in_stock", updatedAt: "2026-07-16", shipsTo: "US" },
  { id: "o101", productId: "p-oneplus12", sourceId: "amazon", price: 649.99, currency: "USD", url: "https://www.amazon.com/s?k=oneplus+12", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },
  // Xiaomi 14 Ultra
  { id: "o102", productId: "p-xiaomi14", sourceId: "xiaomi", price: 1299, currency: "USD", url: "https://www.mi.com/global/product/xiaomi-14-ultra/", availability: "in_stock", updatedAt: "2026-07-14", shipsTo: "US" },
  { id: "o103", productId: "p-xiaomi14", sourceId: "amazon", price: 1149, currency: "USD", url: "https://www.amazon.com/s?k=xiaomi+14+ultra", availability: "low", updatedAt: "2026-07-19", shipsTo: "US" },

  // Dell XPS 14
  { id: "o104", productId: "p-xps14", sourceId: "dell", price: 1899, currency: "USD", url: "https://www.dell.com/en-us/shop/dell-laptops/xps-14/spd/xps-14-9440-laptop", availability: "in_stock", updatedAt: "2026-07-17", shipsTo: "US" },
  { id: "o105", productId: "p-xps14", sourceId: "amazon", price: 1649, currency: "USD", url: "https://www.amazon.com/s?k=dell+xps+14", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },
  // ThinkPad X1 Carbon
  { id: "o106", productId: "p-thinkpad-x1", sourceId: "lenovo", price: 2149, currency: "USD", url: "https://www.lenovo.com/us/en/p/laptops/thinkpad/thinkpadx1/", availability: "in_stock", updatedAt: "2026-07-16", shipsTo: "US" },
  { id: "o107", productId: "p-thinkpad-x1", sourceId: "amazon", price: 1849, currency: "USD", url: "https://www.amazon.com/s?k=thinkpad+x1+carbon+gen+12", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },
  // Surface Laptop 6
  { id: "o108", productId: "p-surface-l6", sourceId: "microsoft", price: 1199.99, currency: "USD", url: "https://www.microsoft.com/en-us/surface/business/surface-laptop-6", availability: "in_stock", updatedAt: "2026-07-15", shipsTo: "US" },
  { id: "o109", productId: "p-surface-l6", sourceId: "bestbuy", price: 999.99, currency: "USD", url: "https://www.bestbuy.com/site/searchpage.jsp?st=surface+laptop+6", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },
  // Keychron Q1 Pro
  { id: "o110", productId: "p-keychron-q1", sourceId: "keychron", price: 199, currency: "USD", url: "https://www.keychron.com/products/keychron-q1-pro-qmk-via-wireless-custom-mechanical-keyboard", availability: "in_stock", updatedAt: "2026-07-14", shipsTo: "US" },
  { id: "o111", productId: "p-keychron-q1", sourceId: "amazon", price: 174, currency: "USD", url: "https://www.amazon.com/s?k=keychron+q1+pro", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },

  // DJI Mini 4 Pro
  { id: "o112", productId: "p-dji-mini4", sourceId: "dji", price: 759, currency: "USD", url: "https://www.dji.com/mini-4-pro", availability: "in_stock", updatedAt: "2026-07-17", shipsTo: "US" },
  { id: "o113", productId: "p-dji-mini4", sourceId: "amazon", price: 699, currency: "USD", url: "https://www.amazon.com/s?k=dji+mini+4+pro", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },
  // Nikon Z6 III
  { id: "o114", productId: "p-nikon-z6iii", sourceId: "nikon", price: 2499.95, currency: "USD", url: "https://www.nikonusa.com/p/z-6iii/1774/overview", availability: "in_stock", updatedAt: "2026-07-16", shipsTo: "US" },
  { id: "o115", productId: "p-nikon-z6iii", sourceId: "amazon", price: 2296.95, currency: "USD", url: "https://www.amazon.com/s?k=nikon+z6+iii", availability: "in_stock", updatedAt: "2026-07-19", shipsTo: "US" },
];

// Trending order (ids) — would come from click/conversion analytics in production.
export const TRENDING_IDS = [
  "p-xm5", "p-ip16p", "p-lg-c4", "p-pixel9p", "p-switch-oled", "p-app2",
  "p-dji-mini4", "p-roborock-s8", "p-s24u", "p-momentum4", "p-aw10", "p-xbox-x",
];
