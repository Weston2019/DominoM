# Avatar Preservation Script for Render Deployments
# This script preserves uploaded avatars during code updates

Write-Host " Starting avatar preservation process..." -ForegroundColor Cyan

# STEP 1: Download avatars from live server (UNCOMMENT AND UPDATE URL)
Write-Host "  Downloading avatars from live server..." -ForegroundColor Yellow
$renderUrl = "https://dominom.onrender.com"  # UPDATE THIS WITH YOUR ACTUAL RENDER URL

# Get list of all avatar files from the live server
try {
    # Try to get directory listing or known files
    $knownAvatars = @("DA_avatar.jpg", "FV_avatar.jpg", "KK_avatar.jpg", "LK_avatar.jpg")
    
    foreach ($avatar in $knownAvatars) {
        try {
            $url = "$renderUrl/assets/icons/$avatar"
            $localPath = "assets/icons/$avatar"
            Write-Host "  Trying to download: $url" -ForegroundColor Gray
            Invoke-WebRequest -Uri $url -OutFile $localPath -ErrorAction Stop
            Write-Host "   Downloaded $avatar" -ForegroundColor Green
        }
        catch {
            Write-Host "    Could not download $avatar (may not exist)" -ForegroundColor Yellow
        }
    }
}
catch {
    Write-Host "  Could not connect to server. Using local avatars only." -ForegroundColor Yellow
}

# STEP 2: Add current local avatars to git (if any exist)
if (Test-Path "assets/icons/*.jpg" -Or Test-Path "assets/icons/*.png") {
    Write-Host " Adding local avatars to git..." -ForegroundColor Yellow
    git add assets/icons/
    Write-Host " Local avatars added to git" -ForegroundColor Green
} else {
    Write-Host "  No local avatars found to add" -ForegroundColor Yellow
}

# STEP 3: Stage all changes for deployment
Write-Host " Staging all changes for deployment..." -ForegroundColor Yellow
git add .

# STEP 4: Show status
Write-Host " Current git status:" -ForegroundColor Cyan
git status

Write-Host " Avatar preservation complete!" -ForegroundColor Green
Write-Host " Now you can commit and push your changes with:" -ForegroundColor Cyan
Write-Host "   git commit -m 'Your update message'" -ForegroundColor White
Write-Host "   git push origin main" -ForegroundColor White
Write-Host "" 
Write-Host " Remember to update the $renderUrl variable with your actual Render app URL!" -ForegroundColor Yellow
