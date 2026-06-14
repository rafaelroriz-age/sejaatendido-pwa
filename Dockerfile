# ─── Build Stage ───
FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_ID
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN if [ -z "$VITE_GOOGLE_CLIENT_ID" ] && [ -n "$GOOGLE_CLIENT_ID" ]; then export VITE_GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID"; fi; npm run build

# ─── Production Stage ───
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
