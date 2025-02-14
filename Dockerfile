# ✅ 改用 puppeteer 官方支援的 Playwright 鏡像
FROM mcr.microsoft.com/playwright:v1.42.0-jammy

# ✅ 移除 `PUPPETEER_EXECUTABLE_PATH`，讓 Puppeteer 自動找到 Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    NODE_ENV=production \
    PORT=4000

WORKDIR /usr/src/app

# 安裝 Node.js 依賴
COPY package*.json ./
RUN npm ci --omit=dev

# 複製程式碼
COPY . .

# ✅ 確保 Chromium 可用
RUN npx playwright install --with-deps chromium

EXPOSE 4000

CMD [ "node", "index.js" ]
