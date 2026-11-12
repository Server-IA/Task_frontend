# Cabeceras de seguridad de las páginas (se incluyen en cada location: un add_header dentro de una location borra los
# del server). La API pone las suyas (Spring Security).
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
# Solo cuenta cuando la página llega por HTTPS (Traefik en Dokploy): el navegador ya no intenta HTTP
add_header Strict-Transport-Security "max-age=31536000" always;
