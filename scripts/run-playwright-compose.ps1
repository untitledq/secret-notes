param(
    [switch]$KeepRunning
)

$ErrorActionPreference = "Stop"

function Wait-Http {
    param(
        [string]$Url,
        [string]$Name,
        [int]$Attempts = 60
    )

    for ($i = 1; $i -le $Attempts; $i += 1) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2

            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                Write-Host "$Name is ready at $Url"
                return
            }
        } catch {
            Start-Sleep -Seconds 2
        }
    }

    throw "$Name did not become ready at $Url"
}

docker compose up -d --build

try {
    Wait-Http -Url "http://localhost:3000/health" -Name "Backend"
    Wait-Http -Url "http://localhost:8080" -Name "Frontend"

    $env:FRONTEND_URL = "http://localhost:8080"
    node .\node_modules\@playwright\test\cli.js test

    if ($LASTEXITCODE -ne 0) {
        throw "Playwright failed with exit code $LASTEXITCODE"
    }
} finally {
    if (-not $KeepRunning) {
        docker compose down
    }
}
