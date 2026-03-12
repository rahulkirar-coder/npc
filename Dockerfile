# -- Stage 1: Build --
FROM node:20-alpine AS build
WORKDIR /app
# Build args (baked into the JS bundle at build time)
ARG VITE_API_BASE_URL
ARG VITE_MAPBOX_TOKEN
ARG VITE_MAP_STYLE
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build
# -- Stage 2: Serve --
FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]