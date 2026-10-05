# syntax=docker/dockerfile:1
FROM docker.io/library/nginx:stable-alpine

LABEL org.opencontainers.image.title="OpenAmbience" \
      org.opencontainers.image.description="An offline-capable ambient sound mixer" \
      org.opencontainers.image.source="https://github.com/Vibeshibe/openambience" \
      org.opencontainers.image.licenses="MIT"

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY index.html styles.css app.js sw.js manifest.webmanifest LICENSE /usr/share/nginx/html/
COPY js/ /usr/share/nginx/html/js/
COPY icons/ /usr/share/nginx/html/icons/
COPY audio/ /usr/share/nginx/html/audio/

USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

# The configuration is fixed; no root-owned entrypoint setup is needed.
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
