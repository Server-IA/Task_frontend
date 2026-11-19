# Imagen del frontend de TaskFlow (para Dokploy): compila la app con Vite y la sirve con nginx (sin privilegios) en el
# puerto 5446, bajo la subruta BASE_PATH (/taskflow: la raíz del dominio es de otra página). nginx también reenvía
# BASE_PATH/api al backend, así la app y la API van en el mismo dominio (sin CORS).
# BASE_PATH empieza con / y no termina en /; tiene que ser la misma SERVER_CONTEXT_PATH del backend.
ARG BASE_PATH=/taskflow

FROM node:22-alpine AS build
ARG BASE_PATH
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# La app llama a la API con una ruta relativa: la del mismo dominio, que nginx reenvía al backend
ARG VITE_API_URL=${BASE_PATH}/api/v1
ENV VITE_API_URL=$VITE_API_URL \
    BASE_PATH=$BASE_PATH
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
ARG BASE_PATH
# Dónde está el backend dentro de la red de Dokploy: el nombre interno de su servicio y su puerto (ver DESPLIEGUE.md)
ENV BACKEND_URL=http://taskflow-backend:8080 \
    BASE_PATH=$BASE_PATH
# La imagen convierte las plantillas de templates/ en la configuración al arrancar, cambiando ${BACKEND_URL} y ${BASE_PATH}
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/security-headers.inc /etc/nginx/conf.d/security-headers.inc
# La app queda en la carpeta de su subruta, así nginx la encuentra con la ruta tal cual llega
COPY --from=build /app/dist /usr/share/nginx/html${BASE_PATH}
EXPOSE 5446
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- "http://127.0.0.1:5446${BASE_PATH}/" > /dev/null || exit 1
