# Imagem simples — recebe assets já buildados pelo CI
FROM nginx:alpine

COPY dist/ /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
