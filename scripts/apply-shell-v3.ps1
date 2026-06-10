# v3 셸 훅 일괄 적용
$ver = '20260654'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (Test-Path (Join-Path (Split-Path $PSScriptRoot -Parent) 'analysis.html')) {
  $golmok = Split-Path $PSScriptRoot -Parent
} else {
  $golmok = 'C:\Users\DOGE\.cursor\projects\f-mu\golmok'
}

function Patch-File($path, $active, $shell, $isM) {
  if (-not (Test-Path $path)) { Write-Host "SKIP $path"; return }
  $c = Get-Content $path -Raw -Encoding UTF8
  $cssBase = if ($isM) { '../css/' } else { 'css/' }
  $jsBase = if ($isM) { '../js/' } else { 'js/' }

  $c = $c -replace '<link rel="stylesheet" href="css/mobile-shell\.css[^"]*">\s*', ''
  $c = $c -replace '<link rel="stylesheet" href="\.\./css/mobile-shell\.css[^"]*">\s*', ''
  $c = $c -replace '<script src="js/mobile-nav\.js[^"]*" defer></script>\s*', ''
  $c = $c -replace '<script src="\.\./js/mobile-nav\.js[^"]*" defer></script>\s*', ''

  $v3links = @"
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${cssBase}main-v3.css?v=$ver">
<link rel="stylesheet" href="${cssBase}shell-pages.css?v=$ver">
"@
  if ($isM) {
    $v3links += "`n<link rel=`"stylesheet`" href=`"${cssBase}main-v3-m.css?v=$ver`">"
  }

  if ($c -notmatch 'main-v3\.css') {
    $c = $c -replace '(</head>)', "$v3links`n`$1"
  }

  $bodyClass = if ($isM) { ' class="m-shell"' } else { '' }
  $bodyAttrs = " data-gm-active=`"$active`" data-gm-shell=`"$shell`""
  if ($c -match '<body[^>]*>') {
    $c = $c -replace '<body[^>]*>', "<body$bodyClass$bodyAttrs>"
  }

  $loader = "<script type=`"module`" src=`"${jsBase}shell_loader.js?v=$ver`"></script>"
  if ($c -notmatch 'shell_loader\.js') {
    $c = $c -replace '</body>', "$loader`n</body>"
  }

  [System.IO.File]::WriteAllText($path, $c, [System.Text.UTF8Encoding]::new($false))
  Write-Host "OK $path ($active / $shell)"
}

# PC transform pages
@(
  @{ f='analysis.html'; a='analysis'; s='analysis' },
  @{ f='community.html'; a='community'; s='standard' },
  @{ f='neighborhood.html'; a='neighborhood'; s='standard' },
  @{ f='by-industry.html'; a='by-industry'; s='standard' },
  @{ f='events.html'; a='events'; s='standard' },
  @{ f='policy.html'; a='policy'; s='standard' },
  @{ f='post.html'; a='post'; s='minimal' },
  @{ f='profile.html'; a='profile'; s='minimal' },
  @{ f='login.html'; a='home'; s='auth' },
  @{ f='startup.html'; a='home'; s='minimal' },
  @{ f='privacy.html'; a='home'; s='auth' },
  @{ f='terms.html'; a='home'; s='auth' },
  @{ f='reset-password.html'; a='home'; s='auth' },
  @{ f='coming-soon.html'; a='home'; s='auth' }
) | ForEach-Object {
  Patch-File (Join-Path $golmok $_.f) $_.a $_.s $false
}

# m/ pages
@(
  @{ f='m\events.html'; a='events'; s='standard' },
  @{ f='m\post.html'; a='post'; s='minimal' },
  @{ f='m\profile.html'; a='profile'; s='minimal' },
  @{ f='m\login.html'; a='home'; s='auth' },
  @{ f='m\startup.html'; a='home'; s='minimal' },
  @{ f='m\privacy.html'; a='home'; s='auth' },
  @{ f='m\terms.html'; a='home'; s='auth' },
  @{ f='m\reset-password.html'; a='home'; s='auth' },
  @{ f='m\coming-soon.html'; a='home'; s='auth' }
) | ForEach-Object {
  Patch-File (Join-Path $golmok $_.f) $_.a $_.s $true
}

Write-Host 'Done.'
