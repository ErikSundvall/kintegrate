<#
.SYNOPSIS
  Simple build script to prepare `docs/demo` for GitHub Pages by copying the `src/` site files.

.DESCRIPTION
  This PowerShell script copies the contents of the `src/` directory into `docs/demo/`,
  creating the directory if necessary, and copies over required top-level files like
  `LICENSE` and `README.md` into `docs/` for the site.

.NOTES
  Run from the repository root in PowerShell. On Windows you can execute:
    .\scripts\build_docs.ps1
#>
param(
  [string]$SourceDir = "src",
  [string]$OutDir = "docs/demo"
)

Write-Host "Building docs demo: copying '$SourceDir' -> '$OutDir'"

if (-not (Test-Path $SourceDir)) {
  Write-Error "Source directory '$SourceDir' not found. Run this script from the repo root."
  exit 1
}

if (Test-Path $OutDir) { Remove-Item $OutDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

# Copy site files (html, css, js and vendor files)
Get-ChildItem -Path $SourceDir -Recurse -File | ForEach-Object {
  $rel = $_.FullName.Substring((Get-Item $SourceDir).FullName.Length).TrimStart('\')
  $dest = Join-Path $OutDir $rel
  $dpath = Split-Path $dest -Parent
  if (-not (Test-Path $dpath)) { New-Item -ItemType Directory -Path $dpath -Force | Out-Null }
  Copy-Item -Path $_.FullName -Destination $dest -Force
}

# Copy top-level assets for the site
Copy-Item -Path LICENSE -Destination docs -Force -ErrorAction SilentlyContinue
Copy-Item -Path README.md -Destination docs -Force -ErrorAction SilentlyContinue

Write-Host "docs/demo prepared. You can now publish `docs/` via GitHub Pages or serve locally." 
