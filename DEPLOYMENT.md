# 🚀 Langres Tour App - Deployment Guide

## Quick Deployment Options (All FREE)

### 🎯 Option 1: Netlify (Recommended - 2 minutes)

1. **Build the app** (already done):
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**:
   - Go to [netlify.com](https://netlify.com)
   - Sign up with GitHub (free)
   - Drag & drop the `dist` folder to Netlify
   - Your app will be live instantly!

3. **Get your URL**: 
   - Netlify gives you a URL like `https://amazing-name-123456.netlify.app`
   - You can customize the subdomain for free

### 🚀 Option 2: Vercel (3 minutes)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

3. **Follow prompts** and get your live URL

### 📁 Option 3: GitHub Pages (5 minutes)

1. **Push to GitHub**:
   - Create new repository on GitHub
   - Push your code
   - Go to Settings > Pages
   - Select source: GitHub Actions

2. **Auto-deployment** set up with the workflow file included

## 🌐 Live Features

Your deployed app will have:
- ✅ Interactive map with Langres POIs
- ✅ GPS simulation for testing
- ✅ Audio descriptions (French TTS)
- ✅ Photo capture functionality
- ✅ Progress tracking
- ✅ Mobile-responsive design
- ✅ Offline-capable (service worker ready)

## 📱 Mobile Testing

Test on mobile by:
1. Opening the live URL on your phone
2. Using browser dev tools mobile simulation
3. PWA installation (Add to Home Screen)

## 🔧 Configuration

The app is pre-configured with:
- Vite build optimization
- Mobile-friendly viewport
- Service worker ready for PWA
- Responsive CSS for all screen sizes

## 📊 Usage Limits (Free Tiers)

- **Netlify**: 100GB bandwidth/month (plenty for POC)
- **Vercel**: Unlimited personal projects
- **GitHub Pages**: Unlimited for public repos

Perfect for POC and demo purposes!
