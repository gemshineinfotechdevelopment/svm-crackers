# Apsara Crackers - Complete VPS Deployment Guide (Ubuntu / Hostinger / DigitalOcean)

This guide provides complete, step-by-step instructions to deploy the **Apsara Crackers** application (React Vite Frontend + Express Node.js Backend on **Port 5015** + **Local MongoDB Server** + Nginx + PM2 + SSL) for your subdomain **`apsara-crackers.gemshine.tech`**.

---

## 🏗️ Architecture Overview

```
                          Internet (User Request)
                                    │
                                    ▼
       [ Nginx Reverse Proxy (Port 80 / 443 HTTPS SSL) ]
                  Host: apsara-crackers.gemshine.tech
                                    │
                ┌───────────────────┴───────────────────┐
                │                                       │
     Frontend (/ & /assets/*)                 Backend API (/api/*)
                │                                       │
                ▼                                       ▼
     Static React SPA Files             Express Node.js Server (Port 5015 via PM2)
     (/var/www/apsara-crackers/dist)                    │
                                        ┌───────────────┴───────────────┐
                                        ▼                               ▼
                               Local MongoDB Server                 Cloudinary
                          (127.0.0.1:27017/apsara_crackers_db)   (Cloud Storage)
```

---

## 🌐 Step 0: Configure DNS Record in Your Domain Registrar
Before generating the SSL certificate, ensure your DNS A-Record is pointed to your VPS:
- **Type**: `A`
- **Name / Host**: `apsara-crackers` (or full `apsara-crackers.gemshine.tech`)
- **Points to (Value)**: `YOUR_VPS_IP_ADDRESS`
- **TTL**: Auto / 300s

*(DNS changes typically take 2-10 minutes to propagate).*

---

## 💻 Step 1: Connect to VPS & Initial Server Setup

Connect to your VPS via SSH:
```bash
ssh root@YOUR_VPS_IP
```

Update system repositories:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget gnupg ufw nginx
```

### Install Node.js (v20 LTS):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v # Verify: should output v20.x.x
npm -v  # Verify: should output v10.x.x
```

### Install PM2 (Process Manager):
```bash
sudo npm install -g pm2
```

---

## 🍃 Step 2: Install & Configure Local MongoDB on VPS

### 1. Import MongoDB Public GPG Key:
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
  --dearmor --yes
```

### 2. Add MongoDB Repository:
- **For Ubuntu 24.04 (Noble)**:
```bash
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
```
- **For Ubuntu 22.04 (Jammy)**:
```bash
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
```
- **For Ubuntu 20.04 (Focal)**:
```bash
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
```

### 3. Install MongoDB:
```bash
sudo apt update
sudo apt install -y mongodb-org
```

### 4. Start and Enable MongoDB on Boot:
```bash
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod
```
*(Press `q` to exit status view. It should say **active (running)**).*

---

## 🗄️ Step 3: Create & Verify MongoDB Database (`apsara_crackers_db`)

You can create and verify the database directly via `mongosh`:

```bash
mongosh
```

Inside the MongoDB shell, run:
```javascript
use apsara_crackers_db
db.createCollection("init_check")
show dbs
exit
```
*(You will see `apsara_crackers_db` listed in the database list).*

---

## 🛡️ Step 4: Configure Firewall (UFW)
Secure your VPS by only exposing web ports (80 & 443) and SSH (22). Local MongoDB (27017) and Backend (5015) remain safely internal on `127.0.0.1`.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

---

## 📂 Step 5: Clone the Project to `/var/www/apsara-crackers`

```bash
sudo mkdir -p /var/www/apsara-crackers
sudo chown -R $USER:$USER /var/www/apsara-crackers
cd /var/www/apsara-crackers

# Clone your repository (or upload files):
git clone <YOUR_GIT_REPO_URL> .
```

---

## ⚙️ Step 6: Configure Environment Variables (.env)

### 1. Root `.env` (Frontend build)
```bash
nano .env
```
Paste:
```env
# Frontend API base URL (Nginx proxies /api/ requests to localhost:5015)
VITE_API_URL=/api
```
*(Press `Ctrl + O` -> `Enter` to save, `Ctrl + X` to exit)*

### 2. Backend `server/.env` (Node.js API Server on Port 5015)
```bash
nano server/.env
```
Paste:
```env
# Backend Server Port
PORT=5015

# Environment Mode
NODE_ENV=production

# Local MongoDB on VPS
MONGODB_URI=mongodb://127.0.0.1:27017/apsara_crackers_db

# Subdomain CORS Whitelist
CORS_ORIGIN=https://apsara-crackers.gemshine.tech,http://apsara-crackers.gemshine.tech,http://localhost:5173,http://localhost:3000,http://localhost:5015

# JWT Secret Key for Admin Authentication
JWT_SECRET=VX7Py5RwPP5fzSfE80D0BqkrG6UWJzEb-CYKjl6v0Q

# Default Admin Credentials (auto-seeded on first run)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password123

# Cloudinary Storage Configuration
CLOUDINARY_CLOUD_NAME=daxl7y5um
CLOUDINARY_API_KEY=579937718567788
CLOUDINARY_API_SECRET=e2euCuyOQycviFSHMYhBK-miEKQ
```
*(Press `Ctrl + O` -> `Enter` to save, `Ctrl + X` to exit)*

---

## 🔨 Step 7: Install Dependencies & Build Project

```bash
cd /var/www/apsara-crackers

# 1. Install root & frontend dependencies
npm install

# 2. Install backend dependencies
npm --prefix server install

# 3. Build frontend & backend (compiles TypeScript to dist/)
npm run build:all
```

---

## 🚀 Step 8: Initialize Database & Seed Default Admin

Run the automated VPS database initialization command:
```bash
npm run init:db
```
This script will:
- Connect to local MongoDB (`apsara_crackers_db`).
- Create all required collections: `admins`, `customers`, `companies`, `products`, `categories`, `pricelists`, `particulars`, `accountledgers`, `settings`, `inventories`.
- Create database indexes.
- Create initial default admin:
  - **Username**: `admin`
  - **Password**: `password123`
- Create initial company ("Apsara Crackers") and settings.

---

## ⚡ Step 9: Start Backend Service with PM2 (Port 5015)

```bash
cd /var/www/apsara-crackers
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```
*(If `pm2 startup` displays a command on screen, copy and paste it into terminal and run it).*

### Check backend logs to verify connection:
```bash
pm2 status
pm2 logs apsara-crackers-api --lines 25
```
You should see:
```
[Database] MongoDB Connected Successfully!
[Database Host] 127.0.0.1:27017
[Database Name] apsara_crackers_db
🚀 Apsara Crackers Server running on port 5015
🔗 Health check: http://localhost:5015/api/health
```

---

## 🌐 Step 10: Configure Nginx Reverse Proxy

Copy the pre-configured Nginx file:
```bash
sudo cp nginx/apsara-crackers.gemshine.tech.conf /etc/nginx/sites-available/apsara-crackers.gemshine.tech
```

Enable the site configuration:
```bash
sudo ln -sf /etc/nginx/sites-available/apsara-crackers.gemshine.tech /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx syntax:
sudo nginx -t

# Restart Nginx:
sudo systemctl restart nginx
```

---

## 🔒 Step 11: Install Free SSL Certificate (HTTPS) with Certbot

Ensure your domain `apsara-crackers.gemshine.tech` is pointing to your VPS IP, then run:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d apsara-crackers.gemshine.tech
```
- Enter your email address for renewal notices.
- Agree to the Terms of Service.
- Certbot will automatically edit `/etc/nginx/sites-available/apsara-crackers.gemshine.tech` to enable HTTPS and configure auto-renewals!

---

## 🧪 Step 12: Verification & Health Check

1. Open your browser and navigate to:
   - **Frontend**: `https://apsara-crackers.gemshine.tech`
   - **Backend Health Check**: `https://apsara-crackers.gemshine.tech/api/health`
2. Expected Backend Response:
   ```json
   {
     "status": "OK",
     "message": "Apsara Crackers API Server is running smoothly",
     "port": 5015,
     "timestamp": "2026-..."
   }
   ```
3. Login to the application with default credentials:
   - **Username**: `admin`
   - **Password**: `password123`

---

## 💾 Step 13: MongoDB Backups & Maintenance (Local DB)

### To Backup the Database:
```bash
mongodump --db=apsara_crackers_db --out=/var/backups/mongo-$(date +%F)
```

### To Restore a Backup:
```bash
mongorestore --db=apsara_crackers_db /var/backups/mongo-YYYY-MM-DD/apsara_crackers_db
```

---

## 🔄 Future Updates (1-Step Auto Deploy)

Whenever you push new code to your Git repository, simply run this single command on your VPS:
```bash
cd /var/www/apsara-crackers
bash deploy.sh
```
This script automatically pulls changes, builds both frontend and backend, and reloads PM2 with zero downtime!
