#!/bin/bash
# One-time blue/green setup for the frontend EC2 (run as root, port 80 must be open).
# nginx on :80 proxies to the active color (blue=8081, green=8082);
# /usr/local/bin/switch-frontend.sh flips traffic, the running container is adopted as blue.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
    echo "Run with sudo."
    exit 1
fi

apt-get update -y
apt-get install -y nginx
rm -f /etc/nginx/sites-enabled/default

# the switch script rewrites this file
echo 'upstream frontend_active { server 127.0.0.1:8081; }' > /etc/nginx/conf.d/upstream.conf

cat > /etc/nginx/conf.d/proxy.conf <<'EOF'
server {
    listen 80;
    location / {
        proxy_pass http://frontend_active;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

cat > /usr/local/bin/switch-frontend.sh <<'EOF'
#!/bin/bash
set -e
NEW_COLOR="$1"
case "$NEW_COLOR" in
  blue)  PORT=8081 ;;
  green) PORT=8082 ;;
  *) echo "Usage: switch-frontend.sh blue|green"; exit 1 ;;
esac

# never switch to a dead environment
curl -fsS "http://127.0.0.1:${PORT}/" > /dev/null

echo "upstream frontend_active { server 127.0.0.1:${PORT}; }" > /etc/nginx/conf.d/upstream.conf
nginx -t && systemctl reload nginx
echo "$NEW_COLOR" > /home/ubuntu/active_color
echo "Frontend traffic now on ${NEW_COLOR} (port ${PORT})"
EOF
chmod +x /usr/local/bin/switch-frontend.sh

# adopt the existing staging container (port 8081) as the first blue environment
if docker ps -a --format '{{.Names}}' | grep -q '^frontend-passive$'; then
    docker rename frontend-passive frontend-blue
fi

echo blue > /home/ubuntu/active_color
chown ubuntu:ubuntu /home/ubuntu/active_color

nginx -t
systemctl enable nginx
systemctl restart nginx

echo "Done. Proxy on :80 points to blue (:8081)."
