const { normalizeOrder, pushWeCom } = require("../order-api");

const orders = [];

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const order = normalizeOrder(req.body || {}, new Date().toISOString());
  orders.unshift(order);

  try {
    await pushWeCom(order);
  } catch (error) {
    console.error("[wecom] push failed", error);
  }

  res.status(201).json({
    ok: true,
    message: "点单成功，我已经收到啦。",
    orderCode: order.code
  });
};

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
