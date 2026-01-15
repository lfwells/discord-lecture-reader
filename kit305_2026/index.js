import express  from 'express';

export default function(app)
{  

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    // Middleware to parse JSON bodies. It only runs if the
    // Content-Type header matches 'application/json'.
    app.use(express.json());
    
    // Middleware to parse URL-encoded bodies. It only runs if the
    // Content-Type header matches 'application/x-www-form-urlencoded'.
    app.use(express.urlencoded({ extended: true }));
    
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
    { id: 1, name: "Product 1", category: "floor", price: 10.0 },
    { id: 2, name: "Product 2", category: "window", price: 20.0 },
    { id: 3, name: "Product 3", category: "floor", price: 15.0 },
    { id: 4, name: "Product 4", category: "window", price: 25.0 },
];