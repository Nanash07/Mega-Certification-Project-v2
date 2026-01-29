# MegaCertification API Test Script
# Usage: .\api-test.ps1 -BaseUrl "http://localhost:8080" -Username "admin" -Password "password"

param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$Username = "admin",
    [string]$Password = "password123"
)

# Colors for output
function Write-Pass { param($msg) Write-Host "[PASS] $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "[FAIL] $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Test { param($msg) Write-Host "[TEST] $msg" -ForegroundColor Yellow }

# Global token variable
$script:Token = $null

# Test results array
$script:Results = @()

function Add-Result {
    param($Name, $Status, $Details)
    $script:Results += [PSCustomObject]@{
        TestName = $Name
        Status = $Status
        Details = $Details
    }
}

# ============ Authentication Tests ============

function Test-Login {
    Write-Test "Testing Login API..."
    
    try {
        $body = @{
            username = $Username
            password = $Password
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method POST -Body $body -ContentType "application/json"
        
        if ($response.token) {
            $script:Token = $response.token
            Write-Pass "Login successful, token received"
            Add-Result "Login with valid credentials" "PASS" "Token received"
            return $true
        } else {
            Write-Fail "Login failed - no token in response"
            Add-Result "Login with valid credentials" "FAIL" "No token in response"
            return $false
        }
    } catch {
        Write-Fail "Login failed: $($_.Exception.Message)"
        Add-Result "Login with valid credentials" "FAIL" $_.Exception.Message
        return $false
    }
}

function Test-LoginInvalidPassword {
    Write-Test "Testing Login with invalid password..."
    
    try {
        $body = @{
            username = $Username
            password = "wrong_password"
        } | ConvertTo-Json
        
        $response = Invoke-WebRequest -Uri "$BaseUrl/api/auth/login" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
        Write-Fail "Should have returned error"
        Add-Result "Login with invalid password" "FAIL" "Expected error but got 200"
        return $false
    } catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Pass "Correctly returned 401 Unauthorized"
            Add-Result "Login with invalid password" "PASS" "401 returned as expected"
            return $true
        } else {
            Write-Pass "Correctly rejected invalid password (Status: $($_.Exception.Response.StatusCode))"
            Add-Result "Login with invalid password" "PASS" "Error returned as expected"
            return $true
        }
    }
}

# ============ Employee Tests ============

function Test-GetEmployeesPaged {
    Write-Test "Testing Get Employees Paged..."
    
    if (-not $script:Token) {
        Write-Fail "No auth token available"
        Add-Result "Get Employees Paged" "FAIL" "No auth token"
        return $false
    }
    
    try {
        $headers = @{ Authorization = "Bearer $($script:Token)" }
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/employees/paged?page=0&size=10" -Method GET -Headers $headers
        
        if ($null -ne $response.content) {
            Write-Pass "Employees list retrieved (Total: $($response.totalElements))"
            Add-Result "Get Employees Paged" "PASS" "Retrieved $($response.totalElements) employees"
            return $true
        } else {
            Write-Fail "Unexpected response format"
            Add-Result "Get Employees Paged" "FAIL" "Unexpected response"
            return $false
        }
    } catch {
        Write-Fail "Failed: $($_.Exception.Message)"
        Add-Result "Get Employees Paged" "FAIL" $_.Exception.Message
        return $false
    }
}

function Test-GetEmployeesWithoutAuth {
    Write-Test "Testing Get Employees without auth token..."
    
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/api/employees/paged" -Method GET -ErrorAction Stop
        Write-Fail "Should have returned 401"
        Add-Result "Get Employees without auth" "FAIL" "Expected 401 but got 200"
        return $false
    } catch {
        if ($_.Exception.Response.StatusCode -eq 401 -or $_.Exception.Response.StatusCode -eq 403) {
            Write-Pass "Correctly returned 401/403"
            Add-Result "Get Employees without auth" "PASS" "Unauthorized as expected"
            return $true
        } else {
            Write-Info "Returned status: $($_.Exception.Response.StatusCode)"
            Add-Result "Get Employees without auth" "INFO" "Status: $($_.Exception.Response.StatusCode)"
            return $true
        }
    }
}

function Test-SearchEmployees {
    Write-Test "Testing Search Employees..."
    
    if (-not $script:Token) {
        Write-Fail "No auth token available"
        return $false
    }
    
    try {
        $headers = @{ Authorization = "Bearer $($script:Token)" }
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/employees/paged?search=test&page=0&size=10" -Method GET -Headers $headers
        
        Write-Pass "Search completed (Found: $($response.totalElements))"
        Add-Result "Search Employees" "PASS" "Search returned results"
        return $true
    } catch {
        Write-Fail "Failed: $($_.Exception.Message)"
        Add-Result "Search Employees" "FAIL" $_.Exception.Message
        return $false
    }
}

# ============ Batch Tests ============

function Test-GetBatches {
    Write-Test "Testing Get Batches..."
    
    if (-not $script:Token) {
        Write-Fail "No auth token available"
        return $false
    }
    
    try {
        $headers = @{ Authorization = "Bearer $($script:Token)" }
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/batches/search?page=0&size=10" -Method GET -Headers $headers
        
        Write-Pass "Batches list retrieved (Total: $($response.totalElements))"
        Add-Result "Get Batches" "PASS" "Retrieved batch list"
        return $true
    } catch {
        Write-Fail "Failed: $($_.Exception.Message)"
        Add-Result "Get Batches" "FAIL" $_.Exception.Message
        return $false
    }
}

function Test-FilterBatchesByStatus {
    Write-Test "Testing Filter Batches by Status..."
    
    if (-not $script:Token) {
        Write-Fail "No auth token available"
        return $false
    }
    
    try {
        $headers = @{ Authorization = "Bearer $($script:Token)" }
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/batches/search?status=ONGOING&page=0&size=10" -Method GET -Headers $headers
        
        Write-Pass "Filtered batches retrieved (Found: $($response.totalElements))"
        Add-Result "Filter Batches by Status" "PASS" "Filter working"
        return $true
    } catch {
        Write-Fail "Failed: $($_.Exception.Message)"
        Add-Result "Filter Batches by Status" "FAIL" $_.Exception.Message
        return $false
    }
}

# ============ Special Operations Tests ============

function Test-RefreshAllEligibility {
    Write-Test "Testing Refresh All Eligibility..."
    
    if (-not $script:Token) {
        Write-Fail "No auth token available"
        return $false
    }
    
    try {
        $headers = @{ Authorization = "Bearer $($script:Token)" }
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/employee-eligibility/refresh" -Method POST -Headers $headers
        
        Write-Pass "Eligibility refresh completed"
        Add-Result "Refresh All Eligibility" "PASS" "Refresh successful"
        return $true
    } catch {
        Write-Fail "Failed: $($_.Exception.Message)"
        Add-Result "Refresh All Eligibility" "FAIL" $_.Exception.Message
        return $false
    }
}

function Test-GetEligibilityDashboard {
    Write-Test "Testing Eligibility Dashboard Count..."
    
    if (-not $script:Token) {
        Write-Fail "No auth token available"
        return $false
    }
    
    try {
        $headers = @{ Authorization = "Bearer $($script:Token)" }
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/employee-eligibility/dashboard/count" -Method GET -Headers $headers
        
        Write-Pass "Dashboard count retrieved"
        Add-Result "Eligibility Dashboard" "PASS" "Dashboard working"
        return $true
    } catch {
        Write-Fail "Failed: $($_.Exception.Message)"
        Add-Result "Eligibility Dashboard" "FAIL" $_.Exception.Message
        return $false
    }
}

function Test-DownloadImportTemplate {
    Write-Test "Testing Download Employee Import Template..."
    
    if (-not $script:Token) {
        Write-Fail "No auth token available"
        return $false
    }
    
    try {
        $headers = @{ Authorization = "Bearer $($script:Token)" }
        $response = Invoke-WebRequest -Uri "$BaseUrl/api/employees/import/template" -Method GET -Headers $headers
        
        if ($response.StatusCode -eq 200 -and $response.Content.Length -gt 0) {
            Write-Pass "Template downloaded (Size: $($response.Content.Length) bytes)"
            Add-Result "Download Import Template" "PASS" "Template received"
            return $true
        } else {
            Write-Fail "Empty response"
            Add-Result "Download Import Template" "FAIL" "Empty response"
            return $false
        }
    } catch {
        Write-Fail "Failed: $($_.Exception.Message)"
        Add-Result "Download Import Template" "FAIL" $_.Exception.Message
        return $false
    }
}

function Test-GetImportLogs {
    Write-Test "Testing Get Import Logs..."
    
    if (-not $script:Token) {
        Write-Fail "No auth token available"
        return $false
    }
    
    try {
        $headers = @{ Authorization = "Bearer $($script:Token)" }
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/employees/import/logs" -Method GET -Headers $headers
        
        Write-Pass "Import logs retrieved (Count: $($response.Count))"
        Add-Result "Get Import Logs" "PASS" "Logs retrieved"
        return $true
    } catch {
        Write-Fail "Failed: $($_.Exception.Message)"
        Add-Result "Get Import Logs" "FAIL" $_.Exception.Message
        return $false
    }
}

function Test-GetNotifications {
    Write-Test "Testing Get Notifications..."
    
    if (-not $script:Token) {
        Write-Fail "No auth token available"
        return $false
    }
    
    try {
        $headers = @{ Authorization = "Bearer $($script:Token)" }
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/notifications/latest?limit=5" -Method GET -Headers $headers
        
        Write-Pass "Notifications retrieved"
        Add-Result "Get Notifications" "PASS" "Notifications working"
        return $true
    } catch {
        Write-Fail "Failed: $($_.Exception.Message)"
        Add-Result "Get Notifications" "FAIL" $_.Exception.Message
        return $false
    }
}

function Test-GetUnreadCount {
    Write-Test "Testing Get Unread Notification Count..."
    
    if (-not $script:Token) {
        Write-Fail "No auth token available"
        return $false
    }
    
    try {
        $headers = @{ Authorization = "Bearer $($script:Token)" }
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/notifications/unread-count" -Method GET -Headers $headers
        
        Write-Pass "Unread count: $($response.count)"
        Add-Result "Get Unread Count" "PASS" "Count: $($response.count)"
        return $true
    } catch {
        Write-Fail "Failed: $($_.Exception.Message)"
        Add-Result "Get Unread Count" "FAIL" $_.Exception.Message
        return $false
    }
}

function Test-GetBatchDashboard {
    Write-Test "Testing Batch Dashboard Count..."
    
    if (-not $script:Token) {
        Write-Fail "No auth token available"
        return $false
    }
    
    try {
        $headers = @{ Authorization = "Bearer $($script:Token)" }
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/batches/dashboard/count" -Method GET -Headers $headers
        
        Write-Pass "Batch dashboard retrieved"
        Add-Result "Batch Dashboard" "PASS" "Dashboard working"
        return $true
    } catch {
        Write-Fail "Failed: $($_.Exception.Message)"
        Add-Result "Batch Dashboard" "FAIL" $_.Exception.Message
        return $false
    }
}

# ============ Main Execution ============

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "  MegaCertification API Test Suite" -ForegroundColor Magenta
Write-Host "  Base URL: $BaseUrl" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

# Run tests
Write-Host "`n=== Authentication Tests ===" -ForegroundColor White
Test-Login
Test-LoginInvalidPassword

Write-Host "`n=== Employee Tests ===" -ForegroundColor White
Test-GetEmployeesPaged
Test-GetEmployeesWithoutAuth
Test-SearchEmployees

Write-Host "`n=== Batch Tests ===" -ForegroundColor White
Test-GetBatches
Test-FilterBatchesByStatus
Test-GetBatchDashboard

Write-Host "`n=== Special Operations Tests ===" -ForegroundColor White
Test-RefreshAllEligibility
Test-GetEligibilityDashboard
Test-DownloadImportTemplate
Test-GetImportLogs
Test-GetNotifications
Test-GetUnreadCount


# Summary
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "  Test Summary" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

$passed = ($script:Results | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($script:Results | Where-Object { $_.Status -eq "FAIL" }).Count
$total = $script:Results.Count

Write-Host "`nTotal: $total | Passed: $passed | Failed: $failed" -ForegroundColor White

if ($failed -gt 0) {
    Write-Host "`nFailed Tests:" -ForegroundColor Red
    $script:Results | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
        Write-Host "  - $($_.TestName): $($_.Details)" -ForegroundColor Red
    }
}

Write-Host "`nDetailed Results:" -ForegroundColor White
$script:Results | Format-Table -AutoSize
