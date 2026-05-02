param(
  [Parameter(Mandatory=$true)][string]$Instrument,
  [Parameter(Mandatory=$true)][string]$From,
  [Parameter(Mandatory=$true)][string]$To,
  [Parameter(Mandatory=$true)][string]$OutDir
)

$ErrorActionPreference = 'Stop'

function To-DateOnly([string]$s) {
  return [DateTime]::Parse($s).Date
}

$fromDate = To-DateOnly $From
$toDate = To-DateOnly $To

if ($toDate -le $fromDate) {
  throw "-To must be later than -From"
}

$targetDir = Join-Path $OutDir $Instrument.ToLower()
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

$d = $fromDate
while ($d -lt $toDate) {
  $next = $d.AddDays(1)
  $dayStr = $d.ToString('yyyy-MM-dd')
  $nextStr = $next.ToString('yyyy-MM-dd')
  $fileName = "${Instrument.ToLower()}_${dayStr}.csv"
  $tmpDir = Join-Path $targetDir ("tmp_" + $dayStr)
  if (Test-Path $tmpDir) { Remove-Item -Recurse -Force $tmpDir }
  New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

  $cmd = @(
    'npx',
    'dukascopy-node',
    '-i', $Instrument.ToLower(),
    '-from', $dayStr,
    '-to', $nextStr,
    '-t', 'tick',
    '-f', 'csv',
    '-dir', $tmpDir,
    '-v'
  )

  & $cmd[0] $cmd[1..($cmd.Length-1)] | Out-Null

  $csv = Get-ChildItem -Path $tmpDir -Filter '*.csv' -Recurse | Select-Object -First 1
  if (-not $csv) {
    throw "No CSV file produced for ${dayStr}"
  }
  Copy-Item -Force $csv.FullName (Join-Path $targetDir $fileName)
  Remove-Item -Recurse -Force $tmpDir

  $d = $next
}

Write-Output $targetDir

