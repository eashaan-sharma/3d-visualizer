# Tiny static web server built on .NET's HttpListener (ships with Windows, nothing to install).
# Browsers refuse to load ES modules from file:// pages, so the app is served from http://localhost.
param([int]$Port = 8080)

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json'; '.obj' = 'text/plain; charset=utf-8'
  '.md' = 'text/markdown; charset=utf-8'; '.png' = 'image/png'; '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon'
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root at http://localhost:$Port/  (press Ctrl+C to stop)"

try {
  while ($listener.IsListening) {
    # Poll the async request so Ctrl+C can interrupt between waits.
    $pending = $listener.GetContextAsync()
    while (-not $pending.Wait(250)) {}
    $ctx = $pending.Result
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($path.EndsWith('/')) { $path += 'index.html' }
    $file = [IO.Path]::GetFullPath((Join-Path $root $path.TrimStart('/')))
    $res = $ctx.Response
    try {
      if ($file.StartsWith($root) -and (Test-Path -LiteralPath $file -PathType Leaf)) {
        $bytes = [IO.File]::ReadAllBytes($file)
        $type = $mime[[IO.Path]::GetExtension($file).ToLower()]
        $res.ContentType = if ($type) { $type } else { 'application/octet-stream' }
        $res.Headers.Add('Cache-Control', 'no-store')
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        $res.StatusCode = 404
      }
    } catch {
      Write-Host "Request for $path failed: $($_.Exception.Message)"
    } finally {
      $res.Close()
    }
  }
} finally {
  $listener.Stop()
}
