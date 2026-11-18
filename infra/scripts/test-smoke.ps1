[CmdletBinding()]
param(
    [string]$WebBaseUrl = "http://127.0.0.1:3000",
    [string]$ApiBaseUrl = "http://127.0.0.1:3001/api/v1"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http

$failures = [System.Collections.Generic.List[string]]::new()
$handler = [System.Net.Http.HttpClientHandler]::new()
$handler.AllowAutoRedirect = $false
$client = [System.Net.Http.HttpClient]::new($handler)
$client.Timeout = [TimeSpan]::FromSeconds(15)

function Invoke-SmokeCheck {
    param(
        [Parameter(Mandatory)]
        [string]$Name,
        [Parameter(Mandatory)]
        [string]$Method,
        [Parameter(Mandatory)]
        [string]$Url,
        [Parameter(Mandatory)]
        [int[]]$ExpectedStatus,
        [hashtable]$Headers = @{},
        [string]$ExpectedLocation,
        [string]$ExpectedContent
    )

    $response = $null
    $request = [System.Net.Http.HttpRequestMessage]::new(
        [System.Net.Http.HttpMethod]::new($Method),
        $Url
    )

    try {
        foreach ($header in $Headers.GetEnumerator()) {
            $null = $request.Headers.TryAddWithoutValidation($header.Key, $header.Value)
        }

        $response = $client.SendAsync($request).GetAwaiter().GetResult()
        $status = [int]$response.StatusCode
        $content = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()

        if ($ExpectedStatus -notcontains $status) {
            throw "expected HTTP $($ExpectedStatus -join ' or '), received HTTP $status"
        }

        if ($ExpectedLocation) {
            $location = if ($response.Headers.Location) {
                $response.Headers.Location.ToString()
            } else {
                ""
            }
            if ($location -notmatch $ExpectedLocation) {
                throw "expected Location to match '$ExpectedLocation', received '$location'"
            }
        }

        if ($ExpectedContent -and $content -notmatch $ExpectedContent) {
            throw "response content did not match '$ExpectedContent'"
        }

        Write-Host "PASS  $Name (HTTP $status)" -ForegroundColor Green
    } catch {
        $message = "$Name`: $($_.Exception.Message)"
        $failures.Add($message)
        Write-Host "FAIL  $message" -ForegroundColor Red
    } finally {
        $request.Dispose()
        if ($response) {
            $response.Dispose()
        }
    }
}

$web = $WebBaseUrl.TrimEnd("/")
$api = $ApiBaseUrl.TrimEnd("/")

try {
    Invoke-SmokeCheck `
        -Name "Next login page renders" `
        -Method "GET" `
        -Url "$web/login" `
        -ExpectedStatus 200 `
        -ExpectedContent "(?i)<!doctype html"

    Invoke-SmokeCheck `
        -Name "Protected Next page redirects to login" `
        -Method "GET" `
        -Url "$web/" `
        -ExpectedStatus @(307, 308) `
        -ExpectedLocation "^(?:https?://[^/]+)?/login\?returnTo="

    Invoke-SmokeCheck `
        -Name "HRBP operations guide redirects to login" `
        -Method "GET" `
        -Url "$web/hrbp-point/operations-guide" `
        -ExpectedStatus @(307, 308) `
        -ExpectedLocation "^(?:https?://[^/]+)?/login\?returnTo="

    Invoke-SmokeCheck `
        -Name "Nest API rejects an anonymous session" `
        -Method "GET" `
        -Url "$api/auth/me" `
        -ExpectedStatus 401 `
        -ExpectedContent "(?i)authentication required"

    Invoke-SmokeCheck `
        -Name "Next forwards API requests to Nest" `
        -Method "GET" `
        -Url "$web/api/auth/me" `
        -ExpectedStatus 401 `
        -ExpectedContent "(?i)authentication required"

    Invoke-SmokeCheck `
        -Name "Next rejects cross-site mutations" `
        -Method "POST" `
        -Url "$web/api/auth/logout" `
        -ExpectedStatus 403 `
        -Headers @{ Origin = "https://smoke-test.invalid" } `
        -ExpectedContent "(?i)cross-site request rejected"
} finally {
    $client.Dispose()
    $handler.Dispose()
}

if ($failures.Count -gt 0) {
    Write-Host "`n$($failures.Count) smoke check(s) failed:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host " - $failure" -ForegroundColor Red
    }
    exit 1
}

Write-Host "`nAll smoke checks passed." -ForegroundColor Green