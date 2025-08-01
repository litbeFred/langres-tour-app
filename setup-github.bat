@echo off
echo 🚀 Setting up Langres Tour App for GitHub...
echo.

echo 📁 Initializing git repository...
git init

echo 📦 Adding all files...
git add .

echo 💾 Creating initial commit...
git commit -m "Initial commit: Langres Tour App with GPS simulation and mobile optimization"

echo 🌟 Setting main branch...
git branch -M main

echo.
echo ✅ Local repository ready!
echo.
echo 📝 Next steps:
echo 1. Create repository on GitHub: https://github.com/new
echo 2. Name it: langres-tour-app
echo 3. Make it PUBLIC (required for free GitHub Pages)
echo 4. Run: git remote add origin https://github.com/YOUR-USERNAME/langres-tour-app.git
echo 5. Run: git push -u origin main
echo.
echo 🌐 Then enable GitHub Pages in repository Settings → Pages
echo.
pause
