FROM node:18-bookworm-slim

WORKDIR /usr/src/system

ENV CHROME_BIN="/usr/bin/chromium" \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true" \
    NODE_ENV="production"
RUN set -x \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
    fonts-freefont-ttf \
    chromium \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "start"]