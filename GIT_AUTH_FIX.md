# 🔐 GitHub Authentication Fix

## Problem
```
remote: Permission to Foli-AI/degn.gg.git denied to FunnelSniper.
fatal: unable to access 'https://github.com/Foli-AI/degn.gg.git/': The requested URL returned error: 403
```

## Solutions

### Option 1: Use Personal Access Token (Recommended)

GitHub no longer accepts passwords for HTTPS. You need a Personal Access Token (PAT).

#### Step 1: Create Personal Access Token
1. Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name: "DEGN Deployment"
4. Select scopes: `repo` (full control of private repositories)
5. Click "Generate token"
6. **COPY THE TOKEN IMMEDIATELY** (you won't see it again)

#### Step 2: Use Token for Authentication

**Option A: Use token in URL (one-time)**
```powershell
# Update remote URL with token
git remote set-url origin https://YOUR_TOKEN@github.com/Foli-AI/degn.gg.git

# Then push
git push -u origin main
```

**Option B: Use Git Credential Manager (recommended)**
```powershell
# Push and enter token when prompted for password
git push -u origin main
# Username: FunnelSniper (or your GitHub username)
# Password: <paste your personal access token>
```

**Option C: Store credentials (Windows)**
```powershell
# Configure Git Credential Manager
git config --global credential.helper wincred

# Then push (will prompt once, then remember)
git push -u origin main
```

### Option 2: Switch to SSH (Alternative)

If you have SSH keys set up:

```powershell
# Change remote to SSH
git remote set-url origin git@github.com:Foli-AI/degn.gg.git

# Push
git push -u origin main
```

### Option 3: Check Repository Permissions

Verify you have write access:
1. Go to https://github.com/Foli-AI/degn.gg
2. Check if you're a collaborator or have write access
3. If not, ask the repository owner to add you as a collaborator

### Option 4: Fork and Push to Your Own Repo

If you don't have access to `Foli-AI/degn.gg`:

```powershell
# Fork the repo on GitHub first, then:
git remote set-url origin https://github.com/FunnelSniper/degn.gg.git
git push -u origin main
```

## Quick Fix Commands

**Most Common Solution (Personal Access Token):**

```powershell
# 1. Get your token from GitHub (see instructions above)

# 2. Update remote with token
git remote set-url origin https://YOUR_TOKEN@github.com/Foli-AI/degn.gg.git

# 3. Push
git push -u origin main
```

**Or use credential helper (Windows):**

```powershell
# Configure credential helper
git config --global credential.helper wincred

# Push (will prompt for username and token)
git push -u origin main
# Username: FunnelSniper
# Password: <paste your personal access token here>
```

## Verify Remote URL

```powershell
# Check current remote
git remote -v

# Should show:
# origin  https://github.com/Foli-AI/degn.gg.git (fetch)
# origin  https://github.com/Foli-AI/degn.gg.git (push)
```

