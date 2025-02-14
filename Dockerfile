# ✅ 使用 Debian-based Puppeteer
FROM mcr.microsoft.com/playwright:v1.42.0-jammy

# 設定 Puppeteer 環境變數
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable \
    NODE_ENV=production \
    PORT=4000

# 設定工作目錄
WORKDIR /usr/src/app

# ✅ 更新 `apt` 並安裝 Puppeteer 依賴
RUN apt-get update && apt-get install -y \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libx11-xcb1 libxcomposite1 libxcursor1 \
    libxdamage1 libxi6 libxtst6 libxrandr2 libasound2 \
    libpangocairo-1.0-0 libgbm1 \
    && rm -rf /var/lib/apt/lists/*  # 清理 apt cache

# 複製 package.json 並安裝依賴
COPY package*.json ./
RUN npm ci --omit=dev

# 複製程式碼
COPY . .

# ✅ 開放 Render 需要的端口
EXPOSE 4000

# 啟動應用程式
CMD [ "node", "index.js" ]
