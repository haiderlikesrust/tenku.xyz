# Reverse proxy for Tenku (tenku.xyz)

Tenku runs in Docker on **127.0.0.1:3000**. Caddy or Nginx on the VPS handles **80/443** and HTTPS.

## Before you start

1. **DNS** — A record `tenku.xyz` → your VPS public IP  
   Optional: `www.tenku.xyz` → same IP (Caddy config redirects www → apex)

2. **Firewall** — allow SSH, HTTP, HTTPS:
   ```bash
   sudo ufw allow OpenSSH
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

3. **App `.env`** on the VPS:
   ```env
   NEXTAUTH_URL=https://tenku.xyz
   ```

4. **Start Tenku** (binds only to localhost):
   ```bash
   docker compose up -d --build
   curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/
   ```
   Should print `200` or `307`.

---

## Option A: Caddy (recommended — automatic HTTPS)

```bash
sudo apt update
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

Copy the Caddyfile from your repo:

```bash
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy obtains Let's Encrypt certificates automatically. Check:

```bash
sudo systemctl status caddy
curl -I https://tenku.xyz
```

Logs: `sudo journalctl -u caddy -f`

---

## Option B: Nginx + Certbot

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/tenku
sudo ln -sf /etc/nginx/sites-available/tenku /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d tenku.xyz -d www.tenku.xyz
```

Certbot adds HTTPS and auto-renewal.

---

## Cron (expired file cleanup)

```bash
crontab -e
```

```
0 3 * * * curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://tenku.xyz/api/cron/purge
```

---

## Troubleshooting

| Problem | Check |
|--------|--------|
| 502 Bad Gateway | `docker compose ps` — is Tenku running? `curl http://127.0.0.1:3000` |
| Login loops / cookies | `NEXTAUTH_URL` must be exactly `https://tenku.xyz` |
| Upload fails at ~1MB | Proxy body limit — Caddy `request_body` / Nginx `client_max_body_size` |
| HTTPS not issued | DNS propagated? Ports 80/443 open? `dig tenku.xyz` |
