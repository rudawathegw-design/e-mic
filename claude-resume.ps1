while ($true) {
    claude --continue $args
    if ($LASTEXITCODE -eq 0) { break }
    Write-Host "Limited. Waiting 5 min then retrying..."
    Start-Sleep -Seconds 300
}