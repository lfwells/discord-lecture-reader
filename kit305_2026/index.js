import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// These lines help resolve paths in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function (app) {

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  const staticPath = path.join(__dirname, '/img');
  console.log("Serving images from:", staticPath);
  app.use("/kit305_2026/img", express.static(staticPath));

  // Middleware to parse JSON bodies. It only runs if the
  // Content-Type header matches 'application/json'.
  app.use(express.json());

  // Middleware to parse URL-encoded bodies. It only runs if the
  // Content-Type header matches 'application/x-www-form-urlencoded'.
  app.use("/kit305_2026", express.json());

  //enable cors
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    next();
  });

  app.get("/kit305_2026", (req, res) => {
    //generate the full url so we can display it in the links
    let url = req.protocol + '://' + req.get('host') + req.originalUrl;
    //remove trailing slash if exists
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    res.send(`<h1>KIT305/721 Sample Data API</h1><p>This is a sample API for KIT305/721.</p><p>Make a web request to <a href='${url}/product'>${url}/product</a> to see the products.</p><p>Make a web request to <a href='${url}/product/1'>${url}/product/:id</a> to see a specific product.</p><p>Make a web request to <a href='${url}/product?category=floor'>${url}/product?category=floor</a> or <a href='${url}/product?category=window'>${url}/product?category=window</a> for a filtered list.</p><p>To download a JSON file in your browser now, use <a href='${url}/products_json'>${url}/products_json</a>, <a href='${url}/products_json?category=floor'>${url}/products_json?category=floor</a>, or <a href='${url}/products_json?category=window'>${url}/products_json?category=window</a>.</p>`);
  });

  app.get("/kit305_2026/product", (req, res) => {
    if (req.query.category) {
      const filtered = data.filter(p => p.category === req.query.category);
      return res.json({ data: filtered });
    }
    return res.json({ data });
  });
  app.get("/kit305_2026/product/:id", (req, res) => {
    const product = data.find(p => p.id == req.params.id);
    if (product) {
      return res.json({ data: product });
    }
    return res.status(404).json({ error: "Product not found" });
  });

  app.get("/kit305_2026/products_json", (req, res) => {
    let filtered = data;
    if (req.query.category) {
      filtered = data.filter(p => p.category === req.query.category);
    }
    const jsonData = JSON.stringify({ data: filtered }, null, 2);
    res.setHeader('Content-disposition', 'attachment; filename=products.json');
    res.setHeader('Content-type', 'application/json');
    res.send(jsonData);
  });

}

const data = [
  {
    "id": "win-001",
    "name": "Standard Roller Blind",
    "description": "Our most popular entry-level blind. Features a high-quality chain mechanism and a weighted bottom bar for a clean hang. Best suited for bedrooms and home offices where simplicity is key.",
    "price_per_sqm": 45.00,
    "min_width": 300,
    "max_width": 1200,
    "max_panels": 1,
    "min_height": 500,
    "max_height": 2400,
    "imageUrl": "https://utasbot.dev/kit305_2026/img/win-001.png",
    "category": "window",
    "variants": ["White", "Beige", "Grey", "Black"]
  },
  {
    "id": "win-002",
    "name": "Modular Vertical Slat",
    "description": "Heavy-duty vertical slats perfect for sliding doors or large windows. The modular track system allows for multiple slats to be grouped into panels for easier operation and stacking.",
    "price_per_sqm": 75.00,
    "min_width": 600,
    "max_width": 1000,
    "max_panels": 4,
    "min_height": 1000,
    "max_height": 3000,
    "imageUrl": "https://utasbot.dev/kit305_2026/img/win-002.png",
    "category": "window",
    "variants": ["Cream", "Slate", "Charcoal"]
  },
  {
    "id": "win-003",
    "name": "Fixed-Width Plantation Shutter",
    "description": "Hand-crafted timber shutters providing a timeless aesthetic. Due to the rigid frame construction, these must be installed in exact panel widths. Highly durable and excellent for heat insulation.",
    "price_per_sqm": 150.00,
    "min_width": 800,
    "max_width": 800,
    "max_panels": 3,
    "min_height": 1000,
    "max_height": 2000,
    "imageUrl": "https://utasbot.dev/kit305_2026/img/win-003.png",
    "category": "window",
    "variants": ["Natural Oak", "Painted White", "Walnut"]
  },
  {
    "id": "win-004",
    "name": "Extra Wide Sheer Curtain",
    "description": "Elegant, lightweight sheer fabric that allows soft light to permeate while maintaining privacy. The fabric is specifically woven to maintain its shape over very wide spans without sagging.",
    "price_per_sqm": 55.00,
    "min_width": 1000,
    "max_width": 3000,
    "max_panels": 2,
    "min_height": 1200,
    "max_height": 4000,
    "imageUrl": "https://utasbot.dev/kit305_2026/img/win-004.png",
    "category": "window",
    "variants": ["Pure White", "Off-White", "Silver"]
  },
  {
    "id": "win-005",
    "name": "Thermal Blackout Blind",
    "description": "Designed for shift workers and media rooms. This blind uses a side-channel system to block 99% of light and provides significant noise reduction from outside environments.",
    "price_per_sqm": 95.00,
    "min_width": 450,
    "max_width": 1800,
    "max_panels": 1,
    "min_height": 600,
    "max_height": 2200,
    "imageUrl": "https://utasbot.dev/kit305_2026/img/win-005.png",
    "category": "window",
    "variants": ["Navy Blue", "Deep Grey", "Midnight Black"]
  },
  {
    "id": "win-006",
    "name": "Cafe-Style Half Shutter",
    "description": "A stylish bottom-half shutter system. Provides privacy for the lower half of the window while leaving the top open for maximum natural light. Common in kitchens and street-facing dining rooms.",
    "price_per_sqm": 130.00,
    "min_width": 400,
    "max_width": 600,
    "max_panels": 4,
    "min_height": 400,
    "max_height": 1000,
    "imageUrl": "https://utasbot.dev/kit305_2026/img/win-006.png",
    "category": "window",
    "variants": ["Antique White", "Sage Green"]
  },
  {
    "id": "win-007",
    "name": "Slimline Aluminium Venetian",
    "description": "Lightweight and moisture-resistant. These 25mm slats are perfect for bathrooms and laundries. The precision-engineered wand allows for micro-adjustments of light filtration.",
    "price_per_sqm": 60.00,
    "min_width": 250,
    "max_width": 2400,
    "max_panels": 1,
    "min_height": 300,
    "max_height": 3000,
    "imageUrl": "https://utasbot.dev/kit305_2026/img/win-007.png",
    "category": "window",
    "variants": ["Brushed Silver", "Gloss White", "Matte Black"]
  },
  {
    "id": "win-008",
    "name": "Velvet Theater Drape",
    "description": "Heavyweight velvet drapes with a gold-threaded trim. These provide superior acoustics for home theaters and high-end living spaces. Requires heavy-duty track installation.",
    "price_per_sqm": 210.00,
    "min_width": 1200,
    "max_width": 2500,
    "max_panels": 2,
    "min_height": 2000,
    "max_height": 5000,
    "imageUrl": "https://utasbot.dev/kit305_2026/img/win-008.png",
    "category": "window",
    "variants": ["Royal Red", "Deep Purple", "Emerald Green"]
  },
  {
    "id": "win-009",
    "name": "Bamboo Eco-Roll",
    "description": "An environmentally friendly choice made from sustainable bamboo fibers. Provides a warm, organic feel to the room. Note: Natural variation in color is expected between batches.",
    "price_per_sqm": 70.00,
    "min_width": 400,
    "max_width": 1500,
    "max_panels": 1,
    "min_height": 800,
    "max_height": 2600,
    "imageUrl": "https://utasbot.dev/kit305_2026/img/win-009.png",
    "category": "window",
    "variants": ["Natural", "Carbonized", "Tiger Stripe"]
  },
  {
    "id": "win-010",
    "name": "Industrial Skylight Blind",
    "description": "A tension-mounted blind specifically designed for angled skylights. Uses a spring-loaded motor to ensure the fabric remains taut and doesn't sag under gravity.",
    "price_per_sqm": 185.00,
    "min_width": 600,
    "max_width": 1200,
    "max_panels": 1,
    "min_height": 600,
    "max_height": 1800,
    "imageUrl": "https://utasbot.dev/kit305_2026/img/win-010.png",
    "category": "window",
    "variants": ["Solar Grey", "Steel Blue"]
  },
  {
    "id": "flr-001",
    "name": "Premium Wool Carpet",
    "description": "100% Australian wool carpet with a thick pile. Provides incredible underfoot comfort and natural stain resistance. Ideal for master bedrooms and quiet living areas.",
    "price_per_sqm": 110.00,
    "min_width": null,
    "max_width": null,
    "max_panels": null,
    "min_height": null,
    "max_height": null,
    "imageUrl": "https://utasbot.dev/kit305_2026/img/flr-001.png",
    "category": "floor",
    "variants": ["Snowy Peak", "River Stone", "Earth Brown"]
  },
  {
    "id": "flr-002",
    "name": "Commercial Grade Nylon",
    "description": "Extremely durable carpet designed for high-traffic areas. The low-loop pile prevents snagging and is easy to clean, making it perfect for hallways and playrooms.",
    "price_per_sqm": 55.00,
    "min_width": null,
    "max_width": null,
    "max_panels": null,
    "min_height": null,
    "max_height": null,
    "imageUrl": "https://utasbot.dev/kit305_2026/img/flr-002.png",
    "category": "floor",
    "variants": ["Office Grey", "Industrial Blue", "Desert Sand"]
  },
  {
    "id": "flr-003",
    "name": "Engineered Oak Floorboards",
    "description": "Real oak veneer atop a stable multi-layer core. Provides the look and feel of solid timber with increased resistance to moisture and temperature fluctuations.",
    "price_per_sqm": 145.00,
    "min_width": null,
    "max_width": null,
    "max_panels": null,
    "min_height": null,
    "max_height": null,
    "imageUrl": "https://utasbot.dev/kit305_2026/img/flr-003.png",
    "category": "floor",
    "variants": ["Light Oak", "American Walnut", "Smoked Grey"]
  },
  {
    "id": "flr-004",
    "name": "Recycled Rubber Gym Floor",
    "description": "Shock-absorbent and heavy-duty. This flooring is designed for home gyms and garage workshops. Provides excellent protection for the subfloor against heavy weights.",
    "price_per_sqm": 80.00,
    "min_width": null,
    "max_width": null,
    "max_panels": null,
    "min_height": null,
    "max_height": null,
    "imageUrl": "https://utasbot.dev/kit305_2026/img/flr-004.png",
    "category": "floor",
    "variants": ["Solid Black", "Blue Fleck", "Red Fleck"]
  },
  {
    "id": "flr-005",
    "name": "Luxury Vinyl Plank",
    "description": "100% waterproof flooring that replicates the look of natural wood. The perfect choice for kitchens and open-plan living where spills are likely to occur.",
    "price_per_sqm": 65.00,
    "min_width": null,
    "max_width": null,
    "max_panels": null,
    "min_height": null,
    "max_height": null,
    "imageUrl": "https://utasbot.dev/kit305_2026/img/flr-005.png",
    "category": "floor",
    "variants": ["Weathered Wood", "Limed Oak", "Rustic Pine"]
  },
  {
    "id": "flr-006",
    "name": "Polished Concrete Tiles",
    "description": "Large-format tiles with a modern industrial aesthetic. Cold to the touch but extremely easy to maintain and compatible with under-floor heating systems.",
    "price_per_sqm": 125.00,
    "min_width": null,
    "max_width": null,
    "max_panels": null,
    "min_height": null,
    "max_height": null,
    "imageUrl": "https://utasbot.dev/kit305_2026/img/flr-006.png",
    "category": "floor",
    "variants": ["Ash", "Obsidian", "Cement"]
  },
  {
    "id": "flr-007",
    "name": "Berber Loop Special",
    "description": "A classic loop-pile carpet with distinctive flecks of color. Offers a rustic look that hides vacuum marks and footprints well in busy family homes.",
    "price_per_sqm": 75.00,
    "min_width": null,
    "max_width": null,
    "max_panels": null,
    "min_height": null,
    "max_height": null,
    "imageUrl": "https://utasbot.dev/kit305_2026/img/flr-007.png",
    "category": "floor",
    "variants": ["Oatmeal", "Pebble", "Hearth"]
  },
  {
    "id": "flr-008",
    "name": "Eco-Cork Floating Floor",
    "description": "Soft, warm, and sustainably harvested. Cork is a natural insulator of both sound and temperature, providing a unique aesthetic for modern interior designs.",
    "price_per_sqm": 90.00,
    "min_width": null,
    "max_width": null,
    "max_panels": null,
    "min_height": null,
    "max_height": null,
    "imageUrl": "https://utasbot.dev/kit305_2026/img/flr-008.png",
    "category": "floor",
    "variants": ["Original", "Dark Roast", "Bleached"]
  },
  {
    "id": "flr-009",
    "name": "Parquetry Herringbone Oak",
    "description": "Complex, pre-finished oak blocks designed for a classic herringbone pattern. Requires expert installation and provides a high-end luxury finish to any formal room.",
    "price_per_sqm": 240.00,
    "min_width": null,
    "max_width": null,
    "max_panels": null,
    "min_height": null,
    "max_height": null,
    "imageUrl": "https://utasbot.dev/kit305_2026/img/flr-009.png",
    "category": "floor",
    "variants": ["Honey", "Raw", "Cognac"]
  },
  {
    "id": "flr-010",
    "name": "Pet-Proof Synthetic Turf",
    "description": "Ultra-tough synthetic fibers designed for indoor-outdoor sunrooms. Features an anti-microbial backing and high-drainage capacity for pet owners.",
    "price_per_sqm": 40.00,
    "min_width": null,
    "max_width": null,
    "max_panels": null,
    "min_height": null,
    "max_height": null,
    "imageUrl": "https://utasbot.dev/kit305_2026/img/flr-010.png",
    "category": "floor",
    "variants": ["Spring Green", "Everglade"]
  }
];