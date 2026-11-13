# Cabeceras de seguridad de las páginas (se incluyen en cada location: un add_header dentro de una location borra los
# del server). La API pone las suyas (Spring Security).
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
# Solo cuenta cuando la página llega por HTTPS (Traefik en Dokploy): el navegador ya no intenta HTTP
add_header Strict-Transport-Security "max-age=31536000" always;
# Content-Security-Policy: el navegador solo ejecuta scripts de la propia app (ninguno en línea ni de otro sitio), solo
# se conecta a la API (misma dirección) y a R2 (subidas y archivos con URL firmada), y solo muestra imágenes de la app,
# de R2 y las fotos de GitHub. Nadie puede incrustar TaskFlow en un iframe, cambiar la base de las URLs ni mandar
# formularios a otro sitio. Si un texto de usuario lograra colar un script, el navegador no lo ejecutaría.
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.r2.cloudflarestorage.com https://avatars.githubusercontent.com; font-src 'self' data:; connect-src 'self' https://*.r2.cloudflarestorage.com; media-src 'self' blob: https://*.r2.cloudflarestorage.com; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests" always;
# Ningún otro sitio obtiene una referencia a la ventana de TaskFlow (window.opener) al abrirla
add_header Cross-Origin-Opener-Policy "same-origin-allow-popups" always;
