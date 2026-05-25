# Deploy Ilmuna ke Server dengan PM2 + Nginx

Panduan ini menjelaskan deploy production untuk:

- frontend: `https://ilmuna.site`
- backend API: `https://backend.ilmuna.site`
- static image dan file upload: `https://backend.ilmuna.site/storage/...`

Stack deploy yang dipakai:

- Ubuntu Server
- Node.js
- PostgreSQL
- PM2 untuk backend
- Nginx untuk reverse proxy frontend dan backend
- Certbot untuk HTTPS

Dokumen ini diasumsikan mengikuti struktur repo saat ini:

- `frontend/` dibuild menjadi static site Vite
- `backend/` dijalankan sebagai Express API
- upload file disimpan di `backend/storage/`

## 1. Arsitektur Deploy

Topologi production:

- `ilmuna.site`
  - dilayani langsung oleh Nginx dari hasil build `frontend/dist`
- `backend.ilmuna.site`
  - request diteruskan oleh Nginx ke backend Node.js yang berjalan di PM2 pada port internal, misalnya `4000`
- `/storage/*`
  - dilayani lewat backend domain `backend.ilmuna.site`
  - file fisik tersimpan di server pada folder `backend/storage/`

Alur auth production:

- frontend memanggil API ke `https://backend.ilmuna.site/api/v1`
- refresh token disimpan sebagai cookie secure
- backend harus berjalan dengan:
  - `APP_MODE=PRODUCTION`
  - HTTPS aktif di depan Nginx
  - `COOKIE_DOMAIN=.ilmuna.site`

## 2. DNS yang Dibutuhkan

Tambahkan record DNS berikut:

```text
A     ilmuna.site           -> IP_SERVER
A     backend.ilmuna.site   -> IP_SERVER
```

Jika menggunakan `www`, tambahkan juga:

```text
CNAME www.ilmuna.site -> ilmuna.site
```

## 3. Struktur Direktori yang Direkomendasikan

Contoh struktur di server:

```text
/var/www/ilmuna/
  app/
    frontend/
    backend/
  shared/
    logs/
```

Contoh final:

```text
/var/www/ilmuna/app/frontend
/var/www/ilmuna/app/backend
/var/www/ilmuna/app/backend/storage
```

## 4. Install Dependensi Server

Update package:

```bash
sudo apt update && sudo apt upgrade -y
```

Install paket utama:

```bash
sudo apt install -y nginx git curl unzip build-essential
```

Install Node.js LTS, misalnya via NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
```

Verifikasi:

```bash
node -v
npm -v
```

Install PM2 global:

```bash
sudo npm install -g pm2
```

Install PostgreSQL jika belum ada:

```bash
sudo apt install -y postgresql postgresql-contrib
```

## 5. Clone Repo dan Siapkan Folder

```bash
sudo mkdir -p /var/www/ilmuna/app
sudo chown -R $USER:$USER /var/www/ilmuna
cd /var/www/ilmuna/app
git clone <URL_REPO_GIT> frontend-backend
```

Jika repo ingin langsung ditempatkan tanpa subfolder tambahan:

```bash
cd /var/www/ilmuna/app
git clone <URL_REPO_GIT> .
```

Pastikan folder storage tersedia:

```bash
mkdir -p /var/www/ilmuna/app/backend/storage
mkdir -p /var/www/ilmuna/app/backend/storage/avatars
mkdir -p /var/www/ilmuna/app/backend/storage/covers
mkdir -p /var/www/ilmuna/app/backend/storage/posts
mkdir -p /var/www/ilmuna/app/backend/storage/groups
mkdir -p /var/www/ilmuna/app/backend/storage/materials
```

## 6. Konfigurasi PostgreSQL

Masuk ke PostgreSQL:

```bash
sudo -u postgres psql
```

Buat database dan user:

```sql
CREATE DATABASE ilmuna;
CREATE USER ilmuna_user WITH ENCRYPTED PASSWORD 'PASSWORD_YANG_KUAT';
GRANT ALL PRIVILEGES ON DATABASE ilmuna TO ilmuna_user;
\q
```

Contoh `DATABASE_URL`:

```text
postgresql://ilmuna_user:PASSWORD_YANG_KUAT@127.0.0.1:5432/ilmuna?schema=public
```

## 7. Environment Frontend

Buat file:

`/var/www/ilmuna/app/frontend/.env.production`

Isi contoh:

```env
VITE_API_URL="https://backend.ilmuna.site/api/v1"
VITE_GOOGLE_CLIENT_ID="GOOGLE_CLIENT_ID_ANDA.apps.googleusercontent.com"
VITE_APP_MODE="PRODUCTION"
```

Catatan:

- `VITE_API_URL` harus mengarah ke domain backend production
- `VITE_GOOGLE_CLIENT_ID` harus sama dengan backend

## 8. Environment Backend

Buat file:

`/var/www/ilmuna/app/backend/.env`

Isi contoh:

```env
APP_MODE="PRODUCTION"
PORT=4000

DATABASE_URL="postgresql://ilmuna_user:PASSWORD_YANG_KUAT@127.0.0.1:5432/ilmuna?schema=public"

CLIENT_ORIGIN="https://ilmuna.site"
COOKIE_DOMAIN=".ilmuna.site"

GOOGLE_CLIENT_ID="GOOGLE_CLIENT_ID_ANDA.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI=""

JWT_ACCESS_SECRET="GANTI_DENGAN_SECRET_PANJANG_MINIMAL_32_CHAR"
JWT_REFRESH_SECRET="GANTI_DENGAN_SECRET_PANJANG_MINIMAL_32_CHAR_BERBEDA"
ACCESS_TOKEN_TTL="15m"
REFRESH_TOKEN_TTL_DAYS="30"
```

Nilai penting:

- `APP_MODE=PRODUCTION`
- `CLIENT_ORIGIN=https://ilmuna.site`
- `COOKIE_DOMAIN=.ilmuna.site`
- `GOOGLE_CLIENT_ID` sama persis dengan frontend

## 9. Konfigurasi Google OAuth

Karena aplikasi memakai Google Identity Services ID token, di Google Cloud Console:

1. Buat OAuth Client type `Web application`
2. Tambahkan `Authorized JavaScript origins`:

```text
https://ilmuna.site
https://backend.ilmuna.site
```

Untuk local development, boleh tambahkan juga:

```text
http://localhost:5173
http://127.0.0.1:5173
```

Catatan:

- `GOOGLE_CLIENT_SECRET` dan `GOOGLE_REDIRECT_URI` tidak dipakai aktif untuk flow popup saat ini
- yang paling penting adalah `GOOGLE_CLIENT_ID` valid dan origin cocok

## 10. Install Dependency dan Build Aplikasi

### Backend

```bash
cd /var/www/ilmuna/app/backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run build
```

### Frontend

```bash
cd /var/www/ilmuna/app/frontend
npm install
npm run build
```

Setelah build frontend, hasil static ada di:

```text
/var/www/ilmuna/app/frontend/dist
```

## 11. Jalankan Backend dengan PM2

Masuk ke folder backend:

```bash
cd /var/www/ilmuna/app/backend
```

Jalankan backend:

```bash
pm2 start dist/src/index.js --name ilmuna-backend
```

Simpan konfigurasi PM2:

```bash
pm2 save
```

Aktifkan startup agar hidup lagi setelah reboot:

```bash
pm2 startup
```

PM2 akan menampilkan command tambahan. Jalankan command itu.

Verifikasi:

```bash
pm2 status
pm2 logs ilmuna-backend
```

## 12. Opsional: Ecosystem File PM2

Kalau ingin lebih rapi, buat file:

`/var/www/ilmuna/app/backend/ecosystem.config.cjs`

Isi:

```js
module.exports = {
  apps: [
    {
      name: 'ilmuna-backend',
      script: 'dist/src/index.js',
      cwd: '/var/www/ilmuna/app/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
```

Jalankan:

```bash
cd /var/www/ilmuna/app/backend
pm2 start ecosystem.config.cjs
pm2 save
```

## 13. Konfigurasi Nginx Frontend

Buat file:

`/etc/nginx/sites-available/ilmuna.site`

Isi:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name ilmuna.site www.ilmuna.site;

    root /var/www/ilmuna/app/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location = /favicon.ico {
        log_not_found off;
        access_log off;
    }

    access_log /var/log/nginx/ilmuna_frontend_access.log;
    error_log  /var/log/nginx/ilmuna_frontend_error.log;
}
```

## 14. Konfigurasi Nginx Backend

Buat file:

`/etc/nginx/sites-available/backend.ilmuna.site`

Isi:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name backend.ilmuna.site;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    access_log /var/log/nginx/ilmuna_backend_access.log;
    error_log  /var/log/nginx/ilmuna_backend_error.log;
}
```

Catatan:

- `client_max_body_size 20M` penting agar upload image/file tidak langsung gagal di Nginx
- `/storage/*` tidak perlu dibuat blok khusus kalau tetap ingin diserve lewat Express seperti implementasi sekarang

## 15. Enable Nginx Site

```bash
sudo ln -s /etc/nginx/sites-available/ilmuna.site /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/backend.ilmuna.site /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Kalau ada default site bawaan Nginx dan tidak dipakai:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 16. Setup HTTPS dengan Certbot

Install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Request sertifikat:

```bash
sudo certbot --nginx -d ilmuna.site -d www.ilmuna.site
sudo certbot --nginx -d backend.ilmuna.site
```

Setelah sukses, Nginx akan otomatis diubah untuk HTTPS.

Verifikasi renewal:

```bash
sudo certbot renew --dry-run
```

## 17. Contoh Bentuk Final Nginx HTTPS

Biasanya Certbot akan menghasilkan struktur seperti ini untuk frontend:

```nginx
server {
    server_name ilmuna.site www.ilmuna.site;

    root /var/www/ilmuna/app/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/ilmuna.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ilmuna.site/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    listen 80;
    listen [::]:80;
    server_name ilmuna.site www.ilmuna.site;
    return 301 https://$host$request_uri;
}
```

Untuk backend akan serupa, tetapi tetap `proxy_pass` ke `127.0.0.1:4000`.

## 18. Setup Image dan File Upload

Implementasi aplikasi saat ini menyimpan upload di:

```text
backend/storage/
```

Subfolder penting:

```text
backend/storage/avatars
backend/storage/covers
backend/storage/posts
backend/storage/groups
backend/storage/materials
```

Pastikan user yang menjalankan PM2 punya izin tulis:

```bash
cd /var/www/ilmuna/app/backend
mkdir -p storage/avatars storage/covers storage/posts storage/groups storage/materials
chmod -R 775 storage
```

Kalau PM2 dijalankan oleh user `ubuntu`, pastikan ownership sesuai:

```bash
chown -R ubuntu:ubuntu /var/www/ilmuna/app/backend/storage
```

URL file akan otomatis berbentuk seperti:

```text
https://backend.ilmuna.site/storage/posts/nama-file.jpg
https://backend.ilmuna.site/storage/materials/nama-file.pdf
```

## 19. Firewall

Kalau memakai UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

## 20. Health Check dan Verifikasi

### Backend

```bash
curl http://127.0.0.1:4000/health
curl https://backend.ilmuna.site/health
```

Response yang diharapkan:

```json
{"ok":true}
```

### Frontend

Buka:

```text
https://ilmuna.site
```

### Storage

Setelah upload satu file dari aplikasi, pastikan file bisa dibuka lewat:

```text
https://backend.ilmuna.site/storage/...
```

## 21. Deploy Ulang Saat Ada Update

### Backend

```bash
cd /var/www/ilmuna/app
git pull

cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart ilmuna-backend
```

### Frontend

```bash
cd /var/www/ilmuna/app/frontend
npm install
npm run build
```

Karena frontend diserve langsung dari folder `dist`, setelah build selesai biasanya tidak perlu restart Nginx. Jika perlu:

```bash
sudo systemctl reload nginx
```

## 22. Checklist Production

Checklist minimum sebelum go live:

- DNS `ilmuna.site` dan `backend.ilmuna.site` sudah mengarah ke server
- `APP_MODE=PRODUCTION`
- `VITE_APP_MODE=PRODUCTION`
- `VITE_API_URL=https://backend.ilmuna.site/api/v1`
- `CLIENT_ORIGIN=https://ilmuna.site`
- `COOKIE_DOMAIN=.ilmuna.site`
- `GOOGLE_CLIENT_ID` frontend dan backend sama
- `npx prisma migrate deploy` sudah dijalankan
- `npm run prisma:seed` sudah dijalankan bila ingin data awal/admin
- backend berjalan normal di PM2
- Nginx config lulus `nginx -t`
- HTTPS aktif untuk kedua domain
- upload file berhasil dan file bisa diakses via `/storage`

## 23. Troubleshooting

### `Error 401: invalid_client` saat login Google

Penyebab paling umum:

- `VITE_GOOGLE_CLIENT_ID` salah
- `GOOGLE_CLIENT_ID` backend beda dengan frontend
- origin `https://ilmuna.site` belum didaftarkan di Google Cloud Console

### Login berhasil tapi request berikutnya 401

Periksa:

- `APP_MODE=PRODUCTION`
- HTTPS benar-benar aktif
- `COOKIE_DOMAIN=.ilmuna.site`
- browser mengizinkan cookie

### Upload gagal 413 Request Entity Too Large

Naikkan:

```nginx
client_max_body_size 20M;
```

di server block backend Nginx.

### File upload berhasil tapi URL 404

Periksa:

- file fisik benar-benar ada di `backend/storage/...`
- backend dijalankan dari folder yang benar
- Nginx mengarah ke backend yang benar
- route `/storage` tidak diblokir oleh reverse proxy

### PM2 hidup tapi backend tidak merespons

Periksa:

```bash
pm2 logs ilmuna-backend
curl http://127.0.0.1:4000/health
```

Kalau curl lokal gagal, berarti masalah ada di proses backend, bukan di Nginx.

## 24. Rekomendasi Tambahan

Untuk produksi yang lebih stabil, sebaiknya tambahkan:

- backup PostgreSQL terjadwal
- backup folder `backend/storage/`
- log rotation PM2
- fail2ban
- monitoring dasar seperti Uptime Kuma atau Grafana

Install logrotate PM2:

```bash
pm2 install pm2-logrotate
```

## 25. Ringkasan Command Penting

### Backend

```bash
cd /var/www/ilmuna/app/backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run build
pm2 start dist/src/index.js --name ilmuna-backend
pm2 save
```

### Frontend

```bash
cd /var/www/ilmuna/app/frontend
npm install
npm run build
```

### Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### SSL

```bash
sudo certbot --nginx -d ilmuna.site -d www.ilmuna.site
sudo certbot --nginx -d backend.ilmuna.site
```
