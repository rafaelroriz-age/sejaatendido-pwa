# ─── Build Stage ───
FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_URL=https://sejaatendido-backend.onrender.com
ARG VITE_MP_PUBLIC_KEY
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_VAPID_PUBLIC_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_MP_PUBLIC_KEY=$VITE_MP_PUBLIC_KEY
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ─── Production Stage ───
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
