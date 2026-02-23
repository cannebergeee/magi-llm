![MAGI System](banner.png)

# MAGI System（LLM 版）一键决议系统

在原版动画风格 UI 的基础上，新增 **“案件描述”输入框**，并将 `MELCHIOR / BALTHASAR / CASPER` 三大模块改造为 **大模型三人格投票**，最后根据 `Priority` 规则输出最终决议。

> 未配置 `OPENAI_API_KEY` 时，会自动退化为“概率模拟”（与原项目一致的随机风格），便于你先跑起来。

## 本地运行

```bash
npm i
cp .env.example .env
# 填入 OPENAI_API_KEY（可选填 OPENAI_BASE_URL / OPENAI_MODEL）

npm run build:css
npm run dev
# 浏览器打开 http://localhost:5173
```

## 在线运行/调试（推荐）

### 方式 A：GitHub Codespaces（最省事）
1. 把本项目推到你自己的 GitHub 仓库（或直接在你的 Fork 上）
2. 点击 **Code → Codespaces → Create codespace**
3. 在终端执行：

```bash
npm i
cp .env.example .env
npm run build:css
npm run dev
```

4. 在 Codespaces 的 **Ports** 面板里打开 5173 端口即可在线访问

### 方式 B：Render 一键部署（有公网 URL）
仓库根目录已包含 `render.yaml`。

- 登录 Render → New → Blueprint → 选择你的仓库
- 在环境变量里填 `OPENAI_API_KEY`（可选 `OPENAI_BASE_URL` / `OPENAI_MODEL`）
- 部署完成后会得到一个公网 URL，可直接在线调试

### 方式 C：Railway 部署
仓库根目录已包含 `railway.json`。

- Railway 新建项目并关联仓库
- 设置环境变量 `OPENAI_API_KEY` 等
- Deploy 后获得公网 URL

## 环境变量

- `OPENAI_API_KEY`：OpenAI 兼容接口 Key
- `OPENAI_BASE_URL`：可选，兼容接口地址（如自建/代理）
- `OPENAI_MODEL`：可选，默认 `gpt-4.1-mini`
- `PORT`：可选，默认 `5173`

## API

`POST /api/vote`

请求：

```json
{
  "caseText": "是否上线一个存在争议的功能？",
  "file": "MAGI_SYS",
  "volume": 66,
  "exMode": false,
  "priority": "AAA"
}
```

返回（示例字段）：

```json
{
  "ok": true,
  "votes": {
    "melchior": {"role":"MELCHIOR","vote":"resolve","confidence":72,"reason":"..."},
    "balthasar": {"role":"BALTHASAR","vote":"reject","confidence":61,"reason":"..."},
    "casper": {"role":"CASPER","vote":"resolve","confidence":55,"reason":"..."}
  },
  "final": "resolve"
}
```

## 字体授权

https://fontworks.co.jp/products/evamatisse/

## 原项目

https://github.com/itorr/magi
