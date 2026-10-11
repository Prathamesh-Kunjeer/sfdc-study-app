$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

Write-Host "Ultimate Revision"
Write-Host "Open http://localhost:4173 in your browser."
Write-Host "For phone testing, use the Phone URL printed below."
Write-Host "The catalog refreshes automatically when the app starts or the browser refreshes."
Write-Host "Press Ctrl+C in this terminal when you are done."
Write-Host ""

node ".\server.mjs"
