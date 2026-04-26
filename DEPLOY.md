# 线上点单部署说明

GitHub Pages 只能托管静态页面，不能运行后端，也不能安全保存企业微信 Webhook。

要让 `https://why-bee-0813.github.io/bee-shop/` 可以下单，需要：

1. 将本项目部署到 Vercel、Render、Railway 或其它能运行 Node API 的平台。
2. 在后端平台环境变量中添加：

```env
WECOM_WEBHOOK=企业微信机器人 Webhook 地址
```

3. 部署后获得后端域名，例如：

```text
https://bee-shop-order-api.vercel.app
```

4. 修改 `config.js`：

```js
window.BEE_ORDER_API_BASE = "https://bee-shop-order-api.vercel.app";
```

5. 将更新后的静态文件发布到 GitHub Pages。

完成后，GitHub Pages 页面会把点单请求发到：

```text
https://bee-shop-order-api.vercel.app/api/orders
```

后端会读取 `process.env.WECOM_WEBHOOK`，保存订单，并推送企业微信群。

不要把真实 Webhook 写进 `config.js`、HTML、JS 或 GitHub 仓库。
