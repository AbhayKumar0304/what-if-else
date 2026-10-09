# What Did I Miss? — Automated Test Runner Script
Write-Host '==========================================================' -ForegroundColor Cyan
Write-Host ' What Did I Miss? — Automated Test Suite Runner' -ForegroundColor Green
Write-Host '==========================================================' -ForegroundColor Cyan
Write-Host ''

$edgePath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
if (-not (Test-Path $edgePath)) {
    $edgeCmd = Get-Command msedge.exe -ErrorAction SilentlyContinue
    if ($edgeCmd) { $edgePath = $edgeCmd.Source }
}

$testRunnerUrl = 'file:///' + ($PSScriptRoot.Replace('\', '/') + '/tests/test-runner.html')

Write-Host '[1/3] Checking Project Files...' -ForegroundColor Yellow
$requiredFiles = @(
    'index.html',
    'styles.css',
    'script.js',
    'README.md',
    'LICENSE',
    '.gitignore',
    'docs/problem-statement.md',
    'docs/security-and-threat-model.md',
    'docs/testing.md',
    'tests/test-runner.html',
    'tests/test-suite.js'
)

$missing = 0
foreach ($f in $requiredFiles) {
    if (Test-Path (Join-Path $PSScriptRoot $f)) {
        Write-Host "  [OK] $f" -ForegroundColor DarkGreen
    } else {
        Write-Host "  [MISSING] $f" -ForegroundColor Red
        $missing++
    }
}

if ($missing -gt 0) {
    Write-Host "Error: Missing $missing required files." -ForegroundColor Red
    exit 1
}

Write-Host ''
Write-Host '[2/3] Performing Security and Architecture Code Audit...' -ForegroundColor Yellow
$scriptContent = Get-Content (Join-Path $PSScriptRoot 'script.js') -Raw

if ($scriptContent -match 'innerHTML\s*=') {
    Write-Host '  [FAIL] Detected innerHTML assignment in script.js' -ForegroundColor Red
    exit 1
} else {
    Write-Host '  [PASS] Zero innerHTML assignments on untrusted input' -ForegroundColor Green
}

if ($scriptContent -match 'localStorage\.setItem|sessionStorage\.setItem|document\.cookie\s*=') {
    Write-Host '  [FAIL] Detected persistent storage writing in script.js' -ForegroundColor Red
    exit 1
} else {
    Write-Host '  [PASS] Zero persistent storage writes (no localStorage, sessionStorage, cookies)' -ForegroundColor Green
}

if ($scriptContent -match 'fetch\(|XMLHttpRequest|WebSocket') {
    Write-Host '  [FAIL] Detected outbound network requests in script.js' -ForegroundColor Red
    exit 1
} else {
    Write-Host '  [PASS] Zero outbound network calls (100% offline and local processing)' -ForegroundColor Green
}

Write-Host ''
Write-Host '[3/3] Running Headless Browser Automated Test Suite...' -ForegroundColor Yellow

if (Test-Path $edgePath) {
    $domOutput = cmd /c ('"{0}" --headless=new --disable-gpu --virtual-time-budget=4000 --dump-dom "{1}"' -f $edgePath, $testRunnerUrl)
    
    $summaryLine = $domOutput | Select-String -Pattern 'ALL TESTS PASSED|TEST FAILURES DETECTED'
    if ($summaryLine) {
        Write-Host "  $($summaryLine.Line.Trim())" -ForegroundColor Green
    }
    
    $passedLine = $domOutput | Select-String -Pattern '<strong id="passed-count">(\d+)</strong>'
    $failedLine = $domOutput | Select-String -Pattern '<strong id="failed-count">(\d+)</strong>'
    
    if ($passedLine -and $failedLine) {
        $pCount = $passedLine.Matches[0].Groups[1].Value
        $fCount = $failedLine.Matches[0].Groups[1].Value
        Write-Host ''
        Write-Host '==========================================================' -ForegroundColor Cyan
        $color = if ([int]$fCount -eq 0) { 'Green' } else { 'Red' }
        Write-Host " FINAL TEST SUMMARY: $pCount PASSED, $fCount FAILED" -ForegroundColor $color
        Write-Host '==========================================================' -ForegroundColor Cyan
    }
} else {
    Write-Host '  [NOTE] Microsoft Edge executable not found at default path. Open tests/test-runner.html in any browser to view live test passes.' -ForegroundColor Yellow
}
