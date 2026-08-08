$url = "https://github.com/electron/electron/releases/download/v34.0.0/electron-v34.0.0-win32-x64.zip"
$destDir = "$PSScriptRoot\node_modules\electron"
$distDir = "$destDir\dist"
$zipFile = "$destDir\electron.zip"

if (!(Test-Path $distDir)) {
    New-Item -ItemType Directory -Force -Path $distDir | Out-Null
}

if (!(Test-Path "$distDir\electron.exe")) {
    Write-Host "Descargando motor de Windows a máxima velocidad con curl..."
    curl.exe -L -o "$zipFile" "$url"

    Write-Host "Extrayendo archivos..."
    Expand-Archive -Path "$zipFile" -DestinationPath "$distDir" -Force

    [System.IO.File]::WriteAllText("$destDir\path.txt", "electron.exe")

    if (Test-Path "$zipFile") {
        Remove-Item -Path "$zipFile" -Force
    }
}

Write-Host "¡TODO LISTO!"

# Alarma sonora de Windows
[console]::beep(800, 200)
[console]::beep(1200, 200)
[console]::beep(1600, 400)
