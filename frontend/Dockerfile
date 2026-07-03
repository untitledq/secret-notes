FROM node:22-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM nginx:alpine

COPY frontend/index.html /usr/share/nginx/html/index.html
COPY frontend/styles.css /usr/share/nginx/html/styles.css
COPY frontend/app.js /usr/share/nginx/html/app.js
COPY --from=deps /app/node_modules/gsap/dist/gsap.min.js /usr/share/nginx/html/vendor/gsap.min.js

EXPOSE 80
