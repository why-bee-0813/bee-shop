function cleanText(value) {
  return String(value || "").trim().slice(0, 1000);
}

function normalizeOrder(body, submittedAt) {
  return {
    code: `BEE-${Date.now().toString().slice(-6)}`,
    product: cleanText(body.product || body.productName || "奶茶"),
    spec: cleanText(body.spec || "未填写"),
    quantity: Math.max(1, Number.parseInt(body.quantity, 10) || 1),
    note: cleanText(body.note || "无"),
    submittedAt,
    category: cleanText(body.category),
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
    "新的点单",
    `商品：${order.product}`,
    `规格：${order.spec}`,
    `数量：${order.quantity}`,
    `备注：${order.note || "无"}`,
    `时间：${formatDateTime(order.submittedAt)}`
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

function formatDateTime(value) {
  const date = new Date(value);
  const pad = (number) => String(number).padStart(2, "0");
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    " ",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
    ":",
    pad(date.getSeconds())
  ].join("");
}

module.exports = {
  normalizeOrder,
  pushWeCom
};
