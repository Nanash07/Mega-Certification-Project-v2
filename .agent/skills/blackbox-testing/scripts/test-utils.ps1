# Test Utilities for MegaCertification
# Helper functions for API testing

# ============ HTTP Helpers ============

function Invoke-ApiRequest {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [switch]$IgnoreError
    )
    
    $params = @{
        Uri = $Url
        Method = $Method
        Headers = $Headers
        ContentType = "application/json"
    }
    
    if ($Body) {
        $params.Body = $Body
    }
    
    try {
        $response = Invoke-RestMethod @params
        return @{
            Success = $true
            Data = $response
            StatusCode = 200
        }
    } catch {
        if ($IgnoreError) {
            return @{
                Success = $false
                Error = $_.Exception.Message
                StatusCode = $_.Exception.Response.StatusCode.value__
            }
        }
        throw
    }
}

function Get-AuthToken {
    param(
        [string]$BaseUrl,
        [string]$Username,
        [string]$Password
    )
    
    $body = @{
        username = $Username
        password = $Password
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method POST -Body $body -ContentType "application/json"
        return $response.token
    } catch {
        Write-Error "Failed to get auth token: $($_.Exception.Message)"
        return $null
    }
}

function Get-AuthHeaders {
    param([string]$Token)
    
    return @{
        Authorization = "Bearer $Token"
        "Content-Type" = "application/json"
    }
}

# ============ Test Helpers ============

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [int]$ExpectedStatus = 200,
        [scriptblock]$Validate = $null
    )
    
    Write-Host "[TEST] $Name..." -ForegroundColor Yellow
    
    $result = Invoke-ApiRequest -Url $Url -Method $Method -Headers $Headers -Body $Body -IgnoreError
    
    $passed = $result.Success -and ($result.StatusCode -eq $ExpectedStatus -or $ExpectedStatus -eq 0)
    
    if ($Validate -and $passed) {
        $passed = & $Validate $result.Data
    }
    
    if ($passed) {
        Write-Host "[PASS] $Name" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $Name (Expected: $ExpectedStatus, Got: $($result.StatusCode))" -ForegroundColor Red
    }
    
    return @{
        Name = $Name
        Passed = $passed
        StatusCode = $result.StatusCode
        Data = $result.Data
        Error = $result.Error
    }
}

function Test-UnauthorizedAccess {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET"
    )
    
    Write-Host "[TEST] $Name (expecting 401/403)..." -ForegroundColor Yellow
    
    $result = Invoke-ApiRequest -Url $Url -Method $Method -IgnoreError
    
    $passed = -not $result.Success -and ($result.StatusCode -eq 401 -or $result.StatusCode -eq 403)
    
    if ($passed) {
        Write-Host "[PASS] $Name - Correctly returned $($result.StatusCode)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $Name - Expected 401/403, got $($result.StatusCode)" -ForegroundColor Red
    }
    
    return @{
        Name = $Name
        Passed = $passed
        StatusCode = $result.StatusCode
    }
}

# ============ Report Helpers ============

function Format-TestResults {
    param([array]$Results)
    
    $passed = ($Results | Where-Object { $_.Passed }).Count
    $failed = ($Results | Where-Object { -not $_.Passed }).Count
    $total = $Results.Count
    
    Write-Host "`n========================================" -ForegroundColor Magenta
    Write-Host "  TEST SUMMARY" -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host "  Total:  $total" -ForegroundColor White
    Write-Host "  Passed: $passed" -ForegroundColor Green
    Write-Host "  Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "White" })
    Write-Host "========================================`n" -ForegroundColor Magenta
    
    if ($failed -gt 0) {
        Write-Host "Failed Tests:" -ForegroundColor Red
        $Results | Where-Object { -not $_.Passed } | ForEach-Object {
            Write-Host "  - $($_.Name)" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    return @{
        Total = $total
        Passed = $passed
        Failed = $failed
        PassRate = [math]::Round(($passed / $total) * 100, 2)
    }
}

# ============ Data Generators ============

function New-RandomEmployee {
    $random = Get-Random -Maximum 99999
    return @{
        nik = "EMP$random"
        name = "Test Employee $random"
        email = "test$random@example.com"
        phone = "08123456$random"
    }
}

function New-RandomBatch {
    $random = Get-Random -Maximum 99999
    $startDate = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
    $endDate = (Get-Date).AddDays(14).ToString("yyyy-MM-dd")
    return @{
        name = "Test Batch $random"
        startDate = $startDate
        endDate = $endDate
        type = "REGULAR"
        status = "DRAFT"
    }
}

# Export functions
Export-ModuleMember -Function *
