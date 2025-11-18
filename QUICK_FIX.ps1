# Quick GitHub Authentication Fix Script
# Run this in PowerShell

Write-Host "🔐 GitHub Authentication Fix" -ForegroundColor Cyan
Write-Host ""

# Check current remote
Write-Host "Current remote URL:" -ForegroundColor Yellow
git remote -v
Write-Host ""

# Option 1: Use Personal Access Token
Write-Host "Option 1: Use Personal Access Token" -ForegroundColor Green
Write-Host "1. Go to: https://github.com/settings/tokens" -ForegroundColor White
Write-Host "2. Click 'Generate new token (classic)'" -ForegroundColor White
Write-Host "3. Select 'repo' scope" -ForegroundColor White
Write-Host "4. Copy the token" -ForegroundColor White
Write-Host ""
$token = Read-Host "Enter your Personal Access Token (or press Enter to skip)"

if ($token) {
    Write-Host ""
    Write-Host "Updating remote URL with token..." -ForegroundColor Yellow
    git remote set-url origin "https://$token@github.com/Foli-AI/degn.gg.git"
    Write-Host "✅ Remote updated" -ForegroundColor Green
    Write-Host ""
    Write-Host "Now run: git push -u origin main" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Option 2: Configure Git Credential Manager" -ForegroundColor Green
    Write-Host "Run these commands:" -ForegroundColor Yellow
    Write-Host "  git config --global credential.helper wincred" -ForegroundColor White
    Write-Host "  git push -u origin main" -ForegroundColor White
    Write-Host "  (Enter your GitHub username and Personal Access Token when prompted)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Option 3: Switch to SSH" -ForegroundColor Green
Write-Host "  git remote set-url origin git@github.com:Foli-AI/degn.gg.git" -ForegroundColor White
Write-Host "  git push -u origin main" -ForegroundColor White

