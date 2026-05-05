function cleanText(value) {
  return String(value || "").trim().slice(0, 1000);
}

function cleanItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    id: cleanText(item.id),
    name: cleanText(item.name),
    category: cleanText(item.category),
    quantity: Math.max(1, Number.parseInt(item.quantity, 10) || 1),
    price: item.price === null || item.price === undefined || item.price === "" ? null : Number(item.price)
  }));
}

function normalizeOrder(body, submittedAt) {
  const items = cleanItems(body.items);
  const product = items.length
    ? items.map((item) => item.name).join("；")
    : cleanText(body.product || body.productName || "奶茶");
  const quantity = items.length
    ? items.reduce((sum, item) => sum + item.quantity, 0)
    : Math.max(1, Number.parseInt(body.quantity, 10) || 1);

  return {
    code: `BEE-${Date.now().toString().slice(-6)}`,
    product,
    spec: cleanText(body.spec || "未填写"),
    quantity,
    items,
    note: cleanText(body.note || "无"),
    submittedAt,
    category: cleanText(body.category || (items.length ? [...new Set(items.map((item) => item.category))].join("；") : "")),
    name: cleanText(body.name),
    phone: cleanText(body.phone),
    contact: cleanText(body.contact),
    address: cleanText(body.address),
    delivery: cleanText(body.delivery),
    payment: cleanText(body.payment),
    budget: cleanText(body.budget)
  };
}

async function pushWeCom(order) {
  const webhook = process.env.WECOM_WEBHOOK;
  if (!webhook) {
    console.error("[wecom] WECOM_WEBHOOK is not set; order saved without notification");
    return;
  }

  const content = [
    "新的订单",
    `商品名称：${getProductNames(order)}`,
    `商品数量：${getQuantitySummary(order)}`,
    `地址：${order.address || "未填写"}`,
    `备注：${order.note || "无"}`,
    `下单时间：${formatBeijingDateTime(order.submittedAt)}`
  ].join("\n");

  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      msgtype: "text",
      text: { content }
    })
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Webhook returned ${response.status}: ${responseText}`);
  }

  let result = null;
  try {
    result = JSON.parse(responseText);
  } catch {
    result = { raw: responseText };
  }

  if (result && typeof result.errcode === "number" && result.errcode !== 0) {
    throw new Error(`Webhook returned errcode ${result.errcode}: ${result.errmsg || responseText}`);
  }

  return result;
}

function getProductNames(order) {
  if (order.items && order.items.length) {
    return order.items.map((item) => item.name).join("；");
  }
  return order.product || "未填写";
}

function getQuantitySummary(order) {
  if (order.items && order.items.length) {
    const itemQuantities = order.items.map((item) => `${item.name} x${item.quantity}`).join("；");
    return `${itemQuantities}（共 ${order.quantity} 件）`;
  }
  return `${order.quantity || 1} 件`;
}

function formatBeijingDateTime(value) {
  const date = new Date(value);
  const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const pad = (number) => String(number).padStart(2, "0");
  return [
    beijingDate.getUTCFullYear(),
    "-",
    pad(beijingDate.getUTCMonth() + 1),
    "-",
    pad(beijingDate.getUTCDate()),
    " ",
    pad(beijingDate.getUTCHours()),
    ":",
    pad(beijingDate.getUTCMinutes()),
    ":",
    pad(beijingDate.getUTCSeconds())
  ].join("");
}

module.exports = {
  normalizeOrder,
  pushWeCom
};
