FROM php:8.2-fpm

# 系统依赖
RUN apt-get update && apt-get install -y \
    git unzip libzip-dev libpng-dev libonig-dev libxml2-dev libcurl4-openssl-dev \
    nginx supervisor \
    && rm -rf /var/lib/apt/lists/*

# PHP 扩展
RUN docker-php-ext-install pdo_mysql mbstring zip exif pcntl bcmath gd
RUN pecl install redis && docker-php-ext-enable redis

# PHP 上传大小限制（图片最大 10M）
RUN printf "upload_max_filesize=10M\npost_max_size=12M\nmemory_limit=256M\n" \
    > /usr/local/etc/php/conf.d/uploads.ini

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Nginx 配置
COPY nginx.conf /etc/nginx/sites-available/default
RUN ln -sf /dev/stdout /var/log/nginx/access.log \
    && ln -sf /dev/stderr /var/log/nginx/error.log

# Supervisor 主配置：include conf.d/*.conf
# - base.conf 含 php-fpm + nginx（4 后端通用）
# - consumer.conf 由 docker-compose 通过 volume mount 注入到 oms/wms 容器
RUN mkdir -p /etc/supervisor/conf.d && \
    printf '%s\n' \
        '[supervisord]' \
        'nodaemon=true' \
        'logfile=/dev/stdout' \
        'logfile_maxbytes=0' \
        '' \
        '[include]' \
        'files=/etc/supervisor/conf.d/*.conf' \
        > /etc/supervisor/supervisord.conf && \
    printf '%s\n' \
        '[program:php-fpm]' \
        'command=php-fpm -F' \
        'autorestart=true' \
        'stdout_logfile=/dev/stdout' \
        'stdout_logfile_maxbytes=0' \
        'stderr_logfile=/dev/stderr' \
        'stderr_logfile_maxbytes=0' \
        '' \
        '[program:nginx]' \
        'command=nginx -g "daemon off;"' \
        'autorestart=true' \
        'stdout_logfile=/dev/stdout' \
        'stdout_logfile_maxbytes=0' \
        'stderr_logfile=/dev/stderr' \
        'stderr_logfile_maxbytes=0' \
        > /etc/supervisor/conf.d/base.conf

WORKDIR /var/www/html
EXPOSE 80

# 启动前确保 runtime 目录归 www-data 所有（named volume 第一次 mount 后是 root 拥有，php-fpm worker 跑 www-data 写不进去）
RUN printf '#!/bin/sh\nmkdir -p /var/www/html/runtime\nchown -R www-data:www-data /var/www/html/runtime\nchmod -R 775 /var/www/html/runtime\nexec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf\n' \
    > /usr/local/bin/start.sh && chmod +x /usr/local/bin/start.sh

CMD ["/usr/local/bin/start.sh"]
