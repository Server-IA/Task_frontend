# Imagen del frontend de TaskFlow (para Dokploy): compila la app con Vite y la sirve con nginx (sin privilegios) en el
# puerto 5446. nginx también reenvía /api al backend, así la app y la API van en el mismo dominio (sin CORS).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# La app llama a la API con una ruta relativa: la del mismo dominio, que nginx reenvía al backend
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
# Dónde está el backend dentro de la red de Dokploy: el nombre interno de su servicio y su puerto (ver DESPLIEGUE.md)
ENV BACKEND_URL=http://taskflow-backend:8080
# La imagen convierte las plantillas de templates/ en la configuración al arrancar, cambiando ${BACKEND_URL}
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/security-headers.inc /etc/nginx/conf.d/security-headers.inc
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 5446
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:5446/ > /dev/null || exit 1
