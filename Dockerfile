# Stage 1: build the React client and compile the server
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: minimal runtime — production dependencies and compiled output only
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production TRUST_PROXY=1 PORT=8080
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
USER node
EXPOSE 8080
CMD ["node", "dist-server/index.js"]
