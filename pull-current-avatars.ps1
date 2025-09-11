# Download all current avatars from live server
$renderUrl = "https://dominom.onrender.com"
$currentAvatars = @("DA_avatar.jpg", "FV_avatar.jpg", "KK_avatar.jpg", "LK_avatar.jpg", "TEST_avatar.jpg", "da_avatar.jpg", "fv_avatar.jpg", "test_avatar.jpg")

Write-Host " Downloading current avatars from live server..." -ForegroundColor Cyan

foreach ($avatar in $currentAvatars) {
    try {
        $url = "$renderUrl/assets/icons/$avatar"
        $localPath = "assets/icons/$avatar"
        Write-Host "  Downloading: $avatar" -ForegroundColor Yellow
        Invoke-WebRequest -Uri $url -OutFile $localPath -ErrorAction Stop
        Write-Host "   Downloaded $avatar" -ForegroundColor Green
    }
    catch {
        Write-Host "    Could not download $avatar" -ForegroundColor Red
    }
}

Write-Host " Adding avatars to git..." -ForegroundColor Cyan
git add assets/icons/
Write-Host " Avatars preserved!" -ForegroundColor Green
