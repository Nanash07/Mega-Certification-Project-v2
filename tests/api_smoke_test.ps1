$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:8080/api"

function Test-Endpoint {
    param($Name, $Method, $Url, $Body, $Headers, $ExpectedStatus)
    Write-Host "TEST: $Name" -NoNewline
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            ContentType = "application/json"
        }
        if ($Body) { $params.Body = $Body }
        if ($Headers) { $params.Headers = $Headers }

        $response = Invoke-RestMethod @params -ErrorAction Stop
        Write-Host " [PASS]" -ForegroundColor Green
        return $response
    } catch {
        $ex = $_.Exception
        if ($ex.Response.StatusCode.value__ -eq $ExpectedStatus) {
             Write-Host " [PASS] (Expected Error)" -ForegroundColor Green
             return $null
        }
        Write-Host " [FAIL]" -ForegroundColor Red
        Write-Host "Error: $($ex.Message)"
        if ($ex.Response) {
            Write-Host "Status: $($ex.Response.StatusCode)"
        }
        return $null
    }
}

# 1. Forge JWT Token (Bypass Login)
$jwtSecret = "B4nKMegaGantengP4keJwTSecretKey123!!XXSecureKey"

function New-JwtToken {
    param($Secret, $Username, $Role)
    
    $header = @{ alg = "HS256"; typ = "JWT" } | ConvertTo-Json -Compress
    $payload = @{
        sub = $Username
        role = $Role
        userId = 1
        employeeId = 1
        iat = [Math]::Floor([decimal](Get-Date).ToUniversalTime().Subtract([DateTime]"1970-01-01").TotalSeconds)
        exp = [Math]::Floor([decimal](Get-Date).AddDays(1).ToUniversalTime().Subtract([DateTime]"1970-01-01").TotalSeconds)
    } | ConvertTo-Json -Compress

    $base64Header = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($header)).TrimEnd('=').Replace('+', '-').Replace('/', '_')
    $base64Payload = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($payload)).TrimEnd('=').Replace('+', '-').Replace('/', '_')
    
    $signatureInput = "$base64Header.$base64Payload"
    $hmac = New-Object Security.Cryptography.HMACSHA256
    $hmac.Key = [Text.Encoding]::UTF8.GetBytes($Secret)
    $signatureBytes = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($signatureInput))
    $base64Signature = [Convert]::ToBase64String($signatureBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')

    return "$signatureInput.$base64Signature"
}

$token = New-JwtToken -Secret $jwtSecret -Username "superadmin" -Role "SUPERADMIN"
Write-Host "Generated Forged Token for Testing" -ForegroundColor Cyan
$headers = @{ Authorization = "Bearer $token" }

# Skip login check, assume token is valid
$loginRes = @{ token = $token }

# 2. Test Get Employees
Test-Endpoint -Name "Get All Employees" -Method "GET" -Url "$baseUrl/employees/paged?size=5" -Headers $headers

# 3. Test Get Batches
Test-Endpoint -Name "Get Batches" -Method "GET" -Url "$baseUrl/batches/search?size=5" -Headers $headers

# 4. Test Notification Config
Test-Endpoint -Name "Get Email Config" -Method "GET" -Url "$baseUrl/email-config/active" -Headers $headers

# 5. Test Notification Templates
Test-Endpoint -Name "Get Notification Templates" -Method "GET" -Url "$baseUrl/notification-templates" -Headers $headers

# 6. Test User Inbox
Test-Endpoint -Name "Get User Notifications" -Method "GET" -Url "$baseUrl/notifications/me" -Headers $headers
