# Script to merge enhanced analytics sections into main documents

$prdPath = "Zaza Draft - Product Requirements Document.md"
$techPath = "Zaza Draft - Technical Specification.md"
$insightsPath = "ENHANCED_Teacher_Insights.md"
$analyticsPath = "ENHANCED_Analytics_Technical.md"

# Read the enhanced content
$enhancedInsights = Get-Content $insightsPath -Raw
$enhancedAnalytics = Get-Content $analyticsPath -Raw

# Read original documents
$prdContent = Get-Content $prdPath -Raw
$techContent = Get-Content $techPath -Raw

# PRD: Replace section 3.3 (Teacher Insights)
# Find the section starting with "### 3.3 Teacher Insights (MVP)"
# and ending before "### 3.4" or "### 4.5"
$prdPattern = '(?s)(### 3\.3 Teacher Insights.*?)(?=### 4\.5 Data & Consent)'
$prdUpdated = $prdContent -replace $prdPattern, $enhancedInsights

# Tech Spec: Replace section 2.3 (Analytics & Metrics Schema)
$techPattern = '(?s)(## 2\.3 Analytics & Metrics Schema.*?)(?=### 3\.6 Analytics Ingestion)'
$techUpdated = $techContent -replace $techPattern, $enhancedAnalytics

# Write updated documents
$prdUpdated | Out-File -FilePath "Zaza Draft - Product Requirements Document_ENHANCED.md" -Encoding UTF8
$techUpdated | Out-File -FilePath "Zaza Draft - Technical Specification_ENHANCED.md" -Encoding UTF8

Write-Host "`nEnhanced documents created:" -ForegroundColor Green
Write-Host "  - Zaza Draft - Product Requirements Document_ENHANCED.md" -ForegroundColor Cyan
Write-Host "  - Zaza Draft - Technical Specification_ENHANCED.md" -ForegroundColor Cyan
Write-Host "`nReview the _ENHANCED versions, then rename to replace originals if satisfied." -ForegroundColor Yellow
