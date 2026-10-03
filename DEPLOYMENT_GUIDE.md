# 🚀 Complete Live Server & Free Hosting Deployment Guide

This guide walks you through deploying **SolarFlow CRM SaaS** on **100% Free Hosting** with free HTTPS subdomains.

---

## 🏗️ Architecture Overview

| Component | Free Platform | Free Domain Provided | Cost |
|---|---|---|---|
| **Frontend UI** | [Vercel](https://vercel.com) | `https://your-project.vercel.app` | **$0 / month** |
| **Backend API** | [Render](https://render.com) or [Koyeb](https://www.koyeb.com) | `https://your-backend.onrender.com` | **$0 / month** |
| **PostgreSQL Database** | [Neon](https://neon.tech) | Direct cloud connection | **$0 / month** |

---

## ⚡ Step 1: Create Free PostgreSQL Database on Neon (1 Minute)

1. Go to [https://neon.tech](https://neon.tech) and sign up (Log in with GitHub or Google — no credit card required).
2. Click **"Create Project"**, name it `solarflow-db`, and choose your nearest region.
3. On the dashboard, copy the **Connection details** string.
4. Format it using `postgresql+psycopg://`:
   ```text
   postgresql+psycopg://<user>:<password>@<neon-host>/neondb?sslmode=require
   ```
   *(Keep this string handy for Step 3).*

---

## 📦 Step 2: Push Your Project to GitHub (2 Minutes)

A local git repository has already been initialized and committed with all deployment configurations (`vercel.json`, `Dockerfile`, `Procfile`, `render.yaml`, `.gitignore`).

1. Go to [https://github.com/new](https://github.com/new) and create a repository (e.g., `solarflow-crm`).
2. Run the following commands in your terminal:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/solarflow-crm.git
   git branch -M main
   git push -u origin main
   ```

---

## ⚙️ Step 3: Deploy Backend on Render (2 Minutes)

1. Sign up / log in to [https://render.com](https://render.com) (with your GitHub account).
2. Click **"New +"** in the top right ➔ Select **"Web Service"**.
3. Select your GitHub repository (`solarflow-crm`).
4. Configure the service settings:
   - **Name**: `solarflow-api` (or any name you like)
   - **Region**: Choose closest to your Neon database region (e.g., Oregon or Frankfurt)
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
5. Click **"Advanced"** ➔ **"Add Environment Variable"**:
   - `DATABASE_URL` = *(Your Neon database connection string from Step 1)*
   - `SECRET_KEY` = `solar_super_secret_jwt_key_2026_change_in_production_987654321`
   - `CORS_ORIGINS` = `["*"]`
   - `PYTHON_VERSION` = `3.12.2`
6. Click **"Deploy Web Service"**.
7. Render will build and deploy your API. Once deployed, copy your free backend URL:
   ```text
   https://solarflow-api.onrender.com
   ```
   *(Test in your browser: `https://solarflow-api.onrender.com/docs` will load the interactive Swagger API documentation! Tables and seed data will initialize automatically on first boot).*

> ⚠️ **Important: Outbound SMTP Ports (25, 465, 587) on Render Free Tier**
> Render blocks outbound traffic on SMTP ports 25, 465, and 587 on their **Free tier** to prevent spam abuse, which results in `[Errno 101] Network is unreachable` when attempting direct TCP connections to `smtp.gmail.com:587`.
>
> **To enable outgoing emails in production:**
> - **Option A (Direct Gmail SMTP on Render):** Upgrade your Render backend instance type from **Free** to **Starter** ($7/mo). Paid Render instances immediately unlock outbound SMTP traffic on ports 587 and 465.
> - **Option B (Alternative Hosting):** Deploy on a platform or VPS that permits outbound SMTP (e.g. Railway, Koyeb, or a cloud VPS with port 587 open in security groups).
> - **Option C (HTTP Email API):** Use a transactional email provider over HTTPS port 443 (such as Resend, Brevo, or SendGrid API), which is never blocked by cloud hosting firewalls.

---

## 🎨 Step 4: Deploy Frontend on Vercel (1 Minute)

1. Sign up / log in to [https://vercel.com](https://vercel.com) (with your GitHub account).
2. Click **"Add New..."** ➔ **"Project"**.
3. Import your `solarflow-crm` GitHub repository.
4. In the configuration screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click "Edit" and select `frontend`
5. Expand **"Environment Variables"** and add:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://<YOUR-RENDER-BACKEND-URL>.onrender.com/api`
     *(Make sure to append `/api` at the end!)*
6. Click **"Deploy"**.
7. Vercel will build and assign your live production URL:
   ```text
   https://solarflow-crm.vercel.app
   ```

---

## 🔑 Logging In to Your Live Site

Once deployed, visit your Vercel URL and log in with the pre-seeded credentials:

| Role | Email | Password |
|---|---|---|
| **Company Admin** | `admin@truesunenergy.in` | `SolarAdmin123!` |
| **Sales Manager** | `manager@truesunenergy.in` | `SolarAdmin123!` |
| **Sales Representative** | `rep@truesunenergy.in` | `SolarAdmin123!` |
| **Super Admin** | `superadmin@solarplatform.com` | `SolarAdmin123!` |

---

## 🌐 Optional: Connecting a Custom Domain (100% Free on Vercel)

If you own a custom domain (e.g. `yourcompany.com` or `crm.yourcompany.com`):
1. In Vercel, go to **Project Settings** ➔ **Domains**.
2. Enter your domain name and click **Add**.
3. Update your domain registrar's DNS records with the CNAME or A record provided by Vercel.
4. Vercel will automatically generate and renew a free Let's Encrypt SSL/TLS certificate.
