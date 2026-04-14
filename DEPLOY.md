# SAAD STUDIO Deployment (Production)

## 1) Server prerequisites
- Ubuntu 22.04+ (or similar Linux)
- Node.js 20 LTS
- npm 10+
- PM2
- Nginx

## 2) Upload project
```bash
cd /var/www
git clone <YOUR_REPO_URL> saadstudio
cd saadstudio
```

## 3) Environment variables
Create `.env` (or `.env.local`) on server with real production keys:
```bash
cp .env.example .env
nano .env
```

Required keys at minimum:
- `NEXT_PUBLIC_APP_URL`
- `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `DATABASE_URL`
- `KIE_API_KEY` / `KIEAI_API_KEY`
- `WAVESPEED_API_KEY`
- `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`
- `ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com`

## 4) Install + build
```bash
npm ci
npm run build
```

## 5) Run with PM2
```bash
npm i -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## 6) Nginx reverse proxy
Create `/etc/nginx/sites-available/saadstudio`:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable + reload:
```bash
ln -s /etc/nginx/sites-available/saadstudio /etc/nginx/sites-enabled/saadstudio
nginx -t
systemctl reload nginx
```

## 7) SSL (Let's Encrypt)
```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 8) Health checks
```bash
pm2 status
pm2 logs saadstudio --lines 100
curl -I http://127.0.0.1:3000/
```

## 9) Update flow
```bash
cd /var/www/saadstudio
git pull
npm ci
npm run build
pm2 restart saadstudio
```

