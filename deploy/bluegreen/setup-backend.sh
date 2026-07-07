#!/bin/bash
# One-time blue/green setup for the backend EC2 (run as root).
# nginx on :3000 proxies to the active color (blue=3001, green=3002);
# /usr/local/bin/switch-backend.sh flips traffic, the running container is adopted as blue.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
    echo "Run with sudo."
    exit 1
fi

apt-get update -y
apt-get install -y nginx
rm -f /etc/nginx/sites-enabled/default

# the switch script rewrites this file
echo 'upstream backend_active { server 127.0.0.1:3001; }' > /etc/nginx/conf.d/upstream.conf

cat > /etc/nginx/conf.d/proxy.conf <<'EOF'
server {
    listen 3000;
    location / {
        proxy_pass http://backend_active;
        proxy_set_header Host $host;
        # keeps client IPs intact for the Fastify rate limit (trustProxy)
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

cat > /usr/local/bin/switch-backend.sh <<'EOF'
#!/bin/bash
set -e
NEW_COLOR="$1"
case "$NEW_COLOR" in
  blue)  PORT=3001 ;;
  green) PORT=3002 ;;
  *) echo "Usage: switch-backend.sh blue|green"; exit 1 ;;
esac

# never switch to a dead environment
curl -fsS "http://127.0.0.1:${PORT}/health" > /dev/null

echo "upstream backend_active { server 127.0.0.1:${PORT}; }" > /etc/nginx/conf.d/upstream.conf
nginx -t && systemctl reload nginx
echo "$NEW_COLOR" > /home/ubuntu/active_color
echo "Backend traffic now on ${NEW_COLOR} (port ${PORT})"
EOF
chmod +x /usr/local/bin/switch-backend.sh

# adopt the existing staging container (port 3001) as the first blue environment
if docker ps -a --format '{{.Names}}' | grep -q '^secret-notes-backend-green$'; then
    docker rename secret-notes-backend-green secret-notes-backend-blue
fi

echo blue > /home/ubuntu/active_color
chown ubuntu:ubuntu /home/ubuntu/active_color

nginx -t
systemctl enable nginx
systemctl restart nginx

echo "Done. Proxy on :3000 points to blue (:3001)."
