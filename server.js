const http = require("http");
const fs = require("fs");
const path = require("path");
const { normalizeOrder, pushWeCom } = require("./order-api");

const rootDir = __dirname;
const dataDir = path.join(rootDir, "data");
const ordersFile = path.join(dataDir, "orders.jsonl");
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

loadDotEnv();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ico": "image/x-icon"
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/api/orders" && req.method === "OPTIONS") {
      sendJson(res, 204, {});
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/orders") {
      await handleCreateOrder(req, res);
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      serveStatic(url.pathname, req, res);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("[server] request failed", error);
    sendJson(res, 500, { error: "Internal server error" });
  }
});

server.on("error", (error) => {
  console.error("[server] failed to start", error);
});

server.listen(port, host, () => {
  console.log(`Order server running at http://${host}:${port}`);
});

function loadDotEnv() {
  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function handleCreateOrder(req, res) {
  const body = await readJsonBody(req);
  const submittedAt = new Date().toISOString();
  const order = normalizeOrder(body, submittedAt);

  await saveOrder(order);
  pushWeCom(order).catch((error) => {
    console.error("[wecom] push failed", error);
  });

  sendJson(res, 201, {
    ok: true,
    message: "点单成功，我已经收到啦。",
    orderCode: order.code
  });
}

async function saveOrder(order) {
  await fs.promises.mkdir(dataDir, { recursive: true });
  await fs.promises.appendFile(ordersFile, `${JSON.stringify(order)}\n`, "utf8");
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(urlPath, req, res) {
  const safePath = decodeURIComponent(urlPath === "/" ? "/index.html" : urlPath);
  const filePath = path.normalize(path.join(rootDir, safePath));

  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(statusCode === 204 ? "" : JSON.stringify(payload));
}
