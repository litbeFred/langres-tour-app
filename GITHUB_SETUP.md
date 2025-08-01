# 🚀 GitHub Repository Setup Guide

## Step-by-Step Instructions

### 1. 📂 Create GitHub Repository

1. **Go to [github.com](https://github.com)**
2. **Click "New repository"** (green button)
3. **Repository settings**:
   - **Name**: `langres-tour-app`
   - **Description**: `Mobile-friendly progressive web app for exploring Langres ramparts`
   - **Visibility**: ✅ Public (required for free GitHub Pages)
   - **Initialize**: ❌ Don't add README, .gitignore, or license (we have them)
4. **Click "Create repository"**

### 2. 🔧 Local Git Setup

Since Git isn't installed, here are your options:

#### Option A: Install Git (Recommended)
1. **Download Git**: [git-scm.com/download/win](https://git-scm.com/download/win)
2. **Install with default settings**
3. **Restart VS Code terminal**
4. **Run these commands**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Langres Tour App"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/langres-tour-app.git
   git push -u origin main
   ```

#### Option B: GitHub Desktop (GUI)
1. **Download**: [desktop.github.com](https://desktop.github.com)
2. **Install and sign in**
3. **File → Add Local Repository**
4. **Select your app folder**
5. **Publish to GitHub**

#### Option C: VS Code Extension
1. **Install "GitHub Pull Requests and Issues" extension**
2. **Sign in to GitHub in VS Code**
3. **Use Source Control panel** (Ctrl+Shift+G)
4. **Initialize Repository → Publish to GitHub**

### 3. 🌐 Enable GitHub Pages

After pushing code:

1. **Go to your repository on GitHub**
2. **Settings tab**
3. **Pages** (left sidebar)
4. **Source**: Deploy from a branch
5. **Branch**: `main` / `(root)`
6. **Save**

**Alternative (Automatic with Actions):**
1. **Settings → Pages**
2. **Source**: GitHub Actions
3. **Use the workflow** (already created in `.github/workflows/deploy.yml`)

### 4. ✅ Your Live App

After 2-5 minutes:
- **URL**: `https://YOUR-USERNAME.github.io/langres-tour-app/`
- **Auto-updates** on every push to main
- **Free forever** for public repos

## 🎯 Benefits of GitHub Pages

✅ **100% Free** for public repositories  
✅ **Custom domains** supported  
✅ **HTTPS** by default  
✅ **Global CDN** for fast loading  
✅ **Automatic deployments** on push  
✅ **No bandwidth limits** (fair use)  
✅ **Version control** built-in  

## 📱 What You'll Get

Your live app will have:
- Interactive Langres ramparts map
- GPS simulation with circular controller
- French audio descriptions
- Photo capture functionality
- Mobile-responsive design
- Progress tracking
- All 21 historical POIs

Perfect for demos and proof-of-concept! 🏰
