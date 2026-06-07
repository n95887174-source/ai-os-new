$ErrorActionPreference = "Stop"
$job = Start-Job -ScriptBlock {
    Set-Location "C:\Users\egily\Desktop\ai-os-new"
    npm run dev
} -Name "vite-dev"
Start-Sleep -Seconds 5
& "C:\Program Files\nodejs\node.exe" monitor-playwright.js
Stop-Job -Name "vite-dev" -PassThru | Remove-Job -Force