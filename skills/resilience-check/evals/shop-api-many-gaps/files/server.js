const express = require("express");
const { createClient } = require("redis");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const redis = createClient({ url: process.env.REDIS_URL });
redis.connect();
const db = new Pool({ connectionString: process.env.DATABASE_URL });

app.get("/products/:id", async (req, res) => {
  const cached = await redis.get(`product:${req.params.id}`);
  if (cached) return res.json(JSON.parse(cached));
  const { rows } = await db.query("SELECT * FROM products WHERE id = $1", [req.params.id]);
  await redis.set(`product:${req.params.id}`, JSON.stringify(rows[0]));
  res.json(rows[0]);
});

app.put("/products/:id/price", async (req, res) => {
  await db.query("UPDATE products SET price_cents = $1 WHERE id = $2", [req.body.price_cents, req.params.id]);
  res.json({ ok: true });
});

app.post("/orders", async (req, res) => {
  const { userId, productId, total_cents } = req.body;
  const pay = await fetch("https://payments.example.com/charge", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId, amount: total_cents }),
  });
  if (!pay.ok) return res.status(502).json({ error: "payment failed" });
  const { rows } = await db.query(
    "INSERT INTO orders (user_id, product_id, total_cents) VALUES ($1, $2, $3) RETURNING *",
    [userId, productId, total_cents]
  );
  try {
    await fetch("https://email.example.com/send", { method: "POST", body: JSON.stringify({ userId, orderId: rows[0].id }) });
  } catch (e) {}
  res.json(rows[0]);
});

app.listen(3000);
