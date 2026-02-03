# Mapeo de puertos a URLs de Railway
$urlMap = @{
    "http://localhost:3000" = "https://kaptah-erp-production.up.railway.app"
    "http://localhost:3001" = "https://grateful-courage-production-4de4.up.railway.app"
    "http://localhost:3003" = "https://imaginative-flexibility-production-c3f2.up.railway.app"
    "http://localhost:3004" = "https://reliable-harmony-production-ca69.up.railway.app"
    "http://localhost:3005" = "https://energetic-communication-production-5b96.up.railway.app"
    "http://localhost:4000" = "https://extraordinary-beauty-production-78f6.up.railway.app"
    "http://localhost:4005" = "https://selfless-analysis-production.up.railway.app"
}

# Obtener todos los archivos .service.ts
$serviceFiles = Get-ChildItem -Path "src\app" -Filter "*.service.ts" -Recurse

foreach ($file in $serviceFiles) {
    $content = Get-Content $file.FullName -Raw
    $modified = $false
    
    foreach ($oldUrl in $urlMap.Keys) {
        if ($content -match [regex]::Escape($oldUrl)) {
            $newUrl = $urlMap[$oldUrl]
            $content = $content -replace [regex]::Escape($oldUrl), $newUrl
            $modified = $true
            Write-Host "✅ $($file.Name): $oldUrl → $newUrl" -ForegroundColor Green
        }
    }
    
    if ($modified) {
        $content | Set-Content $file.FullName -Encoding UTF8
    }
}

Write-Host "`n✅ Actualización completada!" -ForegroundColor Cyan
