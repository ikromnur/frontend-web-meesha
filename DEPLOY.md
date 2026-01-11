# Panduan Deployment ke VPS Hostinger dengan Docker

Panduan ini akan membantu Anda men-deploy aplikasi Frontend Meesha Store ke VPS (Virtual Private Server) menggunakan Docker.

## Prasyarat

1.  **VPS Hostinger** (OS Ubuntu 20.04/22.04 recommended).
2.  **Domain** yang sudah diarahkan ke IP VPS Anda (misal: `meesha.store`).
3.  **Akses SSH** ke VPS (via Terminal atau PuTTY).

## Langkah 1: Masuk ke VPS

Buka terminal di komputer Anda dan login ke VPS:

```bash
ssh root@ip_vps_anda
# Masukkan password VPS jika diminta
```

## Langkah 2: Install Docker & Docker Compose

Jika Docker belum terinstall di VPS, jalankan perintah berikut:

```bash
# Update repository
apt-get update

# Install paket pendukung
apt-get install -y ca-certificates curl gnupg

# Tambahkan GPG Key Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Tambahkan repository Docker
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Cek apakah docker sudah berjalan
docker --version
docker compose version
```

## Langkah 3: Clone Repository

Download source code aplikasi ke VPS:

```bash
# Masuk ke folder home atau folder project
cd /var/www

# Clone repository (pastikan repo public atau sudah setup SSH key)
git clone https://github.com/ikromnur/frontend-meesha.store.git

# Masuk ke folder project
cd frontend-meesha.store
```

## Langkah 4: Konfigurasi Environment Variable

Buat file `.env` dari contoh yang disediakan:

```bash
cp .env.example .env
nano .env
```

**Edit konfigurasi berikut di dalam file `.env`:**

```ini
# URL Backend (API) yang bisa diakses publik
NEXT_PUBLIC_BACKEND_URL=https://api.meesha.store

# URL Frontend (Domain Anda)
NEXTAUTH_URL=https://meesha.store

# Secret Key untuk NextAuth (Wajib diganti!)
# Anda bisa generate dengan command: openssl rand -base64 32
NEXTAUTH_SECRET=ganti_dengan_string_acak_yang_panjang

# URL Backend untuk komunikasi internal container (Server-to-Server)
# Jika backend juga di docker satu network: http://backend_container_name:4000
# Jika backend di server lain/luar docker: sama dengan NEXT_PUBLIC_BACKEND_URL
INTERNAL_BACKEND_URL=https://api.meesha.store
```

Simpan file (Ctrl+O, Enter) dan keluar (Ctrl+X).

## Langkah 5: Build dan Jalankan Container

Jalankan perintah berikut untuk membangun image dan menjalankan container:

```bash
docker compose up -d --build
```

-   `-d`: Menjalankan di background (detached mode).
-   `--build`: Memaksa build ulang image untuk memastikan kode terbaru dipakai.

Cek status container:

```bash
docker compose ps
```

Jika statusnya `Up`, maka aplikasi sudah berjalan di port `3000`.

## Langkah 6: Setup Reverse Proxy (Nginx)

Agar aplikasi bisa diakses via domain (port 80/443) tanpa mengetik `:3000`, gunakan Nginx.

1.  Install Nginx:
    ```bash
    apt-get install -y nginx
    ```

2.  Buat konfigurasi server block:
    ```bash
    nano /etc/nginx/sites-available/meesha.store
    ```

3.  Isi dengan konfigurasi berikut:
    ```nginx
    server {
        listen 80;
        server_name meesha.store www.meesha.store;

        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

4.  Aktifkan konfigurasi:
    ```bash
    ln -s /etc/nginx/sites-available/meesha.store /etc/nginx/sites-enabled/
    nginx -t # Cek error syntax
    systemctl restart nginx
    ```

## Langkah 7: Pasang SSL (HTTPS) dengan Certbot

Agar website aman (gembok hijau):

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d meesha.store -d www.meesha.store
```

Ikuti instruksi di layar. Selesai! Website Anda sekarang live di `https://meesha.store`.

---

## Update Aplikasi (Redeploy)

Jika ada perubahan kode di GitHub, lakukan langkah ini di VPS:

```bash
cd /var/www/frontend-meesha.store
git pull origin main
docker compose up -d --build
```
