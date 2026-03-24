FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

ENV NODE_ENV=production
ENV PORT=7860

EXPOSE 7860

CMD ["npm", "run", "start"]
