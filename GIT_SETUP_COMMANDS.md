# Git Setup Commands for Windows PowerShell

## Step 1: Initialize Git (if not already initialized)

```powershell
# Navigate to project root
cd C:\Users\mojo\Documents\degn

# Check if Git is initialized
if (Test-Path .git) {
    Write-Host "Git already initialized"
} else {
    git init
    Write-Host "Git initialized"
}
```

## Step 2: Add All Files

```powershell
# Stage all files (including backend/matchmaker)
git add .

# Verify what's staged
git status
```

## Step 3: Commit

```powershell
git commit -m "Full project sync"
```

## Step 4: Add Remote and Push

```powershell
# Add your GitHub remote (replace with your actual repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Or if remote already exists, update it:
# git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## Complete One-Liner (if starting fresh)

```powershell
cd C:\Users\mojo\Documents\degn
git init
git add .
git commit -m "Full project sync"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## Verify Files Are Tracked

```powershell
# Check that backend/matchmaker is included
git ls-files | Select-String "backend/matchmaker"

# Should show:
# backend/matchmaker/server.ts
# backend/matchmaker/package.json
# backend/matchmaker/tsconfig.json
# backend/matchmaker/render.yaml
```

## If You Need to Force Add Ignored Files

```powershell
# If backend/matchmaker was previously ignored, force add:
git add -f backend/matchmaker/
git commit -m "Add backend/matchmaker to repository"
```

