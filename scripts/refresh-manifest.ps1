$ErrorActionPreference = "Stop"

$appRoot = Split-Path -Parent $PSScriptRoot
$contentRoot = Join-Path $appRoot "content"
$manifestPath = Join-Path $appRoot "data.js"
$supported = @(".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf")

if (-not (Test-Path -LiteralPath $contentRoot)) {
  throw "Content folder not found: $contentRoot"
}

function Get-RelativePath {
  param(
    [Parameter(Mandatory = $true)][string]$From,
    [Parameter(Mandatory = $true)][string]$To
  )

  $fromPath = if ($From.EndsWith([IO.Path]::DirectorySeparatorChar)) { $From } else { "$From$([IO.Path]::DirectorySeparatorChar)" }
  $fromUri = [Uri]::new($fromPath)
  $toUri = [Uri]::new($To)
  return [Uri]::UnescapeDataString($fromUri.MakeRelativeUri($toUri).ToString()).Replace("/", [IO.Path]::DirectorySeparatorChar)
}

$files = Get-ChildItem -LiteralPath $contentRoot -Recurse -File |
  Where-Object { $supported -contains $_.Extension.ToLowerInvariant() } |
  Sort-Object FullName

$seenIds = @{}
$assets = foreach ($file in $files) {
  $relative = (Get-RelativePath -From $appRoot -To $file.FullName).Replace("\", "/")
  $contentRelative = Get-RelativePath -From $contentRoot -To $file.FullName
  $parts = $contentRelative -split "[\\/]"
  $topic = if ($parts.Length -ge 3) { $parts[1] } elseif ($parts.Length -eq 2) { "Overview" } else { "General" }
  $title = [IO.Path]::GetFileNameWithoutExtension($file.Name) -replace "[-_]+", " "
  $title = ($title -replace "\s+", " ").Trim()
  $kind = if ($file.Extension.ToLowerInvariant() -eq ".pdf") { "pdf" } else { "image" }

  $baseId = (($relative.ToLowerInvariant() -replace "[^a-z0-9]+", "-").Trim("-"))
  $assetId = $baseId
  if ($seenIds.ContainsKey($baseId)) {
    $seenIds[$baseId]++
    $assetId = "$baseId-$($seenIds[$baseId])"
  } else {
    $seenIds[$baseId] = 1
  }

  [PSCustomObject]@{
    id = $assetId
    title = $title
    topic = ($topic -replace "_", " ")
    topicKey = $topic
    type = $kind
    path = $relative
    fileName = $file.Name
    size = $file.Length
  }
}

$json = $assets | ConvertTo-Json -Depth 5
$topics = ($assets | Select-Object -ExpandProperty topic -Unique | Sort-Object) | ConvertTo-Json
$generatedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
$content = @"
window.STUDY_ASSETS = $json;
window.STUDY_TOPICS = $topics;
window.STUDY_MANIFEST_META = {
  generatedAt: "$generatedAt",
  total: $($assets.Count)
};
"@

Set-Content -LiteralPath $manifestPath -Value $content -Encoding UTF8
Write-Host "Generated $manifestPath with $($assets.Count) assets."
