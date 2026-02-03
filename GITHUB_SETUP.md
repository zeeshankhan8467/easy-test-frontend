# GitHub Setup Guide

## Step 1: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right corner
3. Select **"New repository"**
4. Fill in the details:
   - **Repository name**: `easytest` (or any name you prefer)
   - **Description**: "Online Exam, Clicker-Based Assessment, and Analytics Platform"
   - **Visibility**: Choose **Private** (recommended) or **Public**
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click **"Create repository"**

## Step 2: Connect Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these commands:

### Option A: If you haven't pushed anything yet (recommended)

```bash
cd /Users/zeeshan/Development/easytest

# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/easytest.git

# Rename the default branch to main (if needed)
git branch -M main

# Push your code
git push -u origin main
```

### Option B: If you want to use SSH (more secure)

```bash
cd /Users/zeeshan/Development/easytest

# Add the remote repository using SSH (replace YOUR_USERNAME with your GitHub username)
git remote add origin git@github.com:YOUR_USERNAME/easytest.git

# Rename the default branch to main (if needed)
git branch -M main

# Push your code
git push -u origin main
```

## Step 3: Verify

1. Go to your GitHub repository page
2. You should see all your files there
3. The README.md should be displayed on the repository homepage

## Important Notes

### ⚠️ Security Reminders

1. **Never commit `.env` files** - They contain sensitive information like API keys
2. **Check `.gitignore`** - Make sure it includes:
   - `.env` files
   - `node_modules/`
   - `backend-venv/` or `venv/`
   - `__pycache__/`
   - Database files

### 🔐 If you accidentally committed sensitive files:

```bash
# Remove file from git history (but keep local file)
git rm --cached backend/.env

# Commit the removal
git commit -m "Remove .env file from repository"

# Push the changes
git push
```

### 📝 Future Commits

After the initial push, you can commit and push changes like this:

```bash
# Stage your changes
git add .

# Commit with a message
git commit -m "Your commit message describing the changes"

# Push to GitHub
git push
```

### 🔄 Pull Latest Changes

If you're working on multiple machines:

```bash
git pull origin main
```

## Troubleshooting

### Authentication Issues

If you get authentication errors:

1. **For HTTPS**: You may need to use a Personal Access Token instead of password
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Generate a new token with `repo` permissions
   - Use the token as your password

2. **For SSH**: Make sure you have SSH keys set up
   - Check: `ssh -T git@github.com`
   - If not set up, follow: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

### Branch Issues

If you get branch-related errors:

```bash
# Check current branch
git branch

# If you're on a different branch, switch to main
git checkout main

# Or create and switch to main
git checkout -b main
```

