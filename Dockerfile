# syntax=docker/dockerfile:1
FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
# 运行时无需 lessc（document.css 已提交），但保留也不影响

ENV NODE_ENV=production
ENV PORT=10000
EXPOSE 10000

CMD ["node", "server.js"]
