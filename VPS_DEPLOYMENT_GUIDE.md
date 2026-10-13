# SVM Crackers - Complete VPS Deployment Guide (Ubuntu / Hostinger / DigitalOcean)

This guide provides complete, step-by-step instructions to deploy the **SVM Crackers** application (React Vite Frontend + Express Node.js Backend on **Port 5017** + **Local MongoDB Server** + Nginx + PM2 + SSL) for your subdomain **`svm-crackers.gemshine.tech`**.

---

## 🏗️ Architecture Overview

```
                          Internet (User Request)
                                    │
                                    ▼
       [ Nginx Reverse Proxy (Port 80 / 443 HTTPS SSL) ]
                   Host: svm-crackers.gemshine.tech
                                    │
                ┌───────────────────┴───────────────────┐
                │                                       │
     Frontend (/ & /assets/*)                 Backend API (/api/*)
                │                                       │
                ▼                                       ▼
     Static React SPA Files             Express Node.js Server (Port 5017 via PM2)
     (/var/www/svm-crackers/dist)                       │
                                        ┌───────────────┴───────────────┐
                                        ▼                               ▼
                               Local MongoDB Server                 Cloudinary
                          (127.0.0.1:27017/svm_crackers)          (Cloud Storage)
```

---

## 🌐 Step 0: Configure DNS Record in Your Domain Registrar
Before generating the SSL certificate, ensure your DNS A-Record is pointed to your VPS:
- **Type**: `A`
- **Name / Host**: `svm-crackers` (or full `svm-crackers.gemshine.tech`)
- **Points to (Value)**: `YOUR_VPS_IP_ADDRESS`
- **TTL**: Auto / 300s

*(DNS changes typically take 2-10 minutes to propagate. You can test propagation using: `nslookup svm-crackers.gemshine.tech` or `ping svm-crackers.gemshine.tech`).*

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
Check your Ubuntu version (`lsb_release -a`) and run the matching command:

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
sudo systemctl daemon-reload
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod
```
*(Verify active status shows `active (running)` - press `q` to exit status view).*

---

## 🗄️ Step 3: Create & Verify MongoDB Database (`svm_crackers`)

In MongoDB, databases are created automatically once the first collection or document is created.
You can verify your MongoDB connection with `mongosh`:

```bash
mongosh
```

Inside the MongoDB shell:
```javascript
use svm_crackers
db.createCollection("test")
show dbs
exit
```
*(You will see `svm_crackers` listed in the database list).*

---

## 🛡️ Step 4: Configure VPS Firewall (UFW)
Secure your VPS by only exposing web ports (80 & 443) and SSH (22). Local MongoDB (27017) and Backend (5017) remain safely internal on `127.0.0.1`.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp        # SSH access
sudo ufw allow 'Nginx Full'  # Port 80 (HTTP) & Port 443 (HTTPS)
sudo ufw enable
sudo ufw status
```

---

## 📂 Step 5: Clone the Project to `/var/www/svm-crackers`

```bash
sudo mkdir -p /var/www/svm-crackers
sudo chown -R $USER:$USER /var/www/svm-crackers
cd /var/www/svm-crackers

# Clone your GitHub repository:
git clone https://github.com/YOUR_GITHUB_USERNAME/svm-crackers.git .
```
*(If already cloned or copied via SCP/SFTP, make sure all files are in `/var/www/svm-crackers`).*

---

## ⚙️ Step 6: Create Environment Variables

### 1. Frontend Root `.env` (`/var/www/svm-crackers/.env`)
Create or edit `.env` in the root folder:
```bash
nano /var/www/svm-crackers/.env
```
Paste:
```env
# Frontend API base URL (Nginx proxies /api/ requests to localhost:5017)
VITE_API_URL=/api
VITE_BACKEND_TARGET=http://localhost:5017
```
*(Press `Ctrl + O`, `Enter` to save, `Ctrl + X` to exit).*

### 2. Backend `server/.env` (Node.js API Server on Port 5017)
Create or edit `server/.env`:
```bash
nano /var/www/svm-crackers/server/.env
```
Paste:
```env
# Backend Server Port
PORT=5017

# Environment Mode
NODE_ENV=production

# Local MongoDB on VPS
MONGODB_URI=mongodb://127.0.0.1:27017/svm_crackers

# Frontend Client URL for CORS
CORS_ORIGIN=https://svm-crackers.gemshine.tech,http://svm-crackers.gemshine.tech,http://localhost:5173,http://localhost:3000,http://localhost:5017

# JWT Secret Key for Admin Authentication
JWT_SECRET=svm_crackers_jwt_secret_key_prod_2026_secure_hash

# Default Admin Credentials (Auto-seeded on database initialization)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password123

# Cloudinary Storage Configuration for PDF / File Uploads
CLOUDINARY_CLOUD_NAME=daxl7y5um
CLOUDINARY_API_KEY=579937718567788
CLOUDINARY_API_SECRET=e2euCuyOQycviFSHMYhBK-miEKQ
```
*(Press `Ctrl + O`, `Enter` to save, `Ctrl + X` to exit).*

---

## 📦 Step 7: Install Dependencies & Build Frontend + Backend

Run from the root project folder:
```bash
cd /var/www/svm-crackers

# Install root & frontend dependencies
npm install

# Install backend dependencies
npm --prefix server install

# Build both frontend SPA (/dist) and backend TypeScript (/server/dist)
npm run build:all
```

Verify that both build directories exist:
```bash
ls -la dist/         # Contains index.html, assets/
ls -la server/dist/  # Contains index.js, initVpsDb.js, etc.
```

---

## 🚀 Step 8: Initialize & Seed VPS MongoDB Database

Run the database initialization script:
```bash
cd /var/www/svm-crackers
npm --prefix server run init:db
```

This automated script will:
- Connect to local MongoDB (`svm_crackers`).
- Ensure all collections exist: `admins`, `customers`, `companies`, `products`, `categories`, `pricelists`, `particulars`, `accountledgers`, `settings`, `inventories`.
- Create database indexes for high performance.
- Create default Admin user (`admin` / `password123`).
- Create initial company ("SVM Crackers") and settings.

You should see:
```text
=============================================
✅ SVM Crackers VPS Database initialized successfully!
   Database Name : svm_crackers
   Admin Login   : admin / password123
=============================================
```

---

## ⚡ Step 9: Start Backend Service with PM2 (Port 5017)

```bash
cd /var/www/svm-crackers

# Start backend using the ecosystem config
pm2 start ecosystem.config.cjs

# Save PM2 process list so it automatically restarts on VPS reboot
pm2 save
pm2 startup
# (Run the sudo env PATH=... command that pm2 startup outputs if prompted)

# Check running status:
pm2 status
pm2 logs svm-crackers-api --lines 25
```

You should see output like:
```text
=============================================
[Database] MongoDB Connected Successfully!
[Database Host] 127.0.0.1:27017
[Database Name] svm_crackers
=============================================
 🚀 SVM Crackers Server running on port 5017
 🔗 Health check: http://localhost:5017/api/health
 🌐 Environment: production
=============================================
```

---

## 🌐 Step 10: Configure Nginx Reverse Proxy

### 1. Copy Nginx Configuration File:
```bash
sudo cp /var/www/svm-crackers/nginx/svm-crackers.gemshine.tech.conf /etc/nginx/sites-available/svm-crackers.gemshine.tech
```

### 2. Enable Site by Creating Symlink:
```bash
sudo ln -sf /etc/nginx/sites-available/svm-crackers.gemshine.tech /etc/nginx/sites-enabled/
```

### 3. Test & Reload Nginx:
```bash
sudo nginx -t
# Should output:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

sudo systemctl reload nginx
```

---

## 🔒 Step 11: Setup Free Let's Encrypt SSL (HTTPS) with Certbot

Ensure your domain `svm-crackers.gemshine.tech` is pointing to your VPS IP, then run:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d svm-crackers.gemshine.tech
```

Follow the prompts:
- Enter your email address for renewal notices.
- Agree to terms (`Y`).
- Certbot will automatically edit `/etc/nginx/sites-available/svm-crackers.gemshine.tech` to enable HTTPS and configure auto-renewals!

Verify Certbot auto-renewal timer:
```bash
sudo systemctl status certbot.timer
```

---

## ✅ Step 12: Verify Your Deployment

Open in your browser:
1. **Frontend**: `https://svm-crackers.gemshine.tech`
2. **Backend Health Check**: `https://svm-crackers.gemshine.tech/api/health`

You should receive JSON:
```json
{
  "status": "OK",
  "message": "SVM Crackers API Server is running smoothly",
  "port": 5017,
  "timestamp": "2026-10-13T..."
}
```

3. **Login to Admin**:
   - URL: `https://svm-crackers.gemshine.tech/login`
   - Username: `admin`
   - Password: `password123`

---

## 🔄 Step 13: Future Updates & One-Click Deploy

Whenever you push new code to GitHub, update your VPS with a single command:

```bash
cd /var/www/svm-crackers
bash deploy.sh
```

`deploy.sh` automatically:
1. Pulls latest Git changes (`git pull origin main`)
2. Installs any new packages (`npm install` & `npm --prefix server install`)
3. Builds frontend & backend (`npm run build:all`)
4. Gracefully reloads PM2 backend process (`pm2 reload ecosystem.config.cjs`)

---

## 🛠️ Helpful VPS Maintenance Commands

### PM2 Commands:
```bash
pm2 status                    # View app status
pm2 logs svm-crackers-api     # View live server logs
pm2 restart svm-crackers-api  # Restart backend server
pm2 stop svm-crackers-api     # Stop backend server
```

### Nginx Commands:
```bash
sudo nginx -t                 # Test Nginx syntax
sudo systemctl reload nginx   # Reload Nginx without downtime
sudo systemctl restart nginx  # Restart Nginx
sudo tail -f /var/log/nginx/error.log  # View Nginx errors
```

### MongoDB Commands:
```bash
sudo systemctl status mongod  # Check MongoDB service status
sudo systemctl restart mongod # Restart MongoDB

# Backup MongoDB database:
mongodump --db=svm_crackers --out=/var/backups/mongo-$(date +%F)

# Restore MongoDB database:
mongorestore --db=svm_crackers /var/backups/mongo-YYYY-MM-DD/svm_crackers
```
