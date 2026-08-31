@echo off
setlocal
set "DEST=%LOCALAPPDATA%\HVO-Notifier"
set "SRC=%~dp0"

if not exist "%DEST%" mkdir "%DEST%"
copy /Y "%SRC%HVO-Notifier.ps1" "%DEST%\HVO-Notifier.ps1" >nul
copy /Y "%SRC%Start-HVO-Notifier.bat" "%DEST%\Start-HVO-Notifier.bat" >nul
copy /Y "%SRC%README.txt" "%DEST%\README.txt" >nul
copy /Y "%SRC%hvo-notifier.ico" "%DEST%\hvo-notifier.ico" >nul

REM Clear cached token so next start forces re-login with notifier client flag
if exist "%DEST%\config.json" del /F /Q "%DEST%\config.json" >nul 2>&1

set "STARTMENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Hyvision One Notifier.lnk"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut('%STARTMENU%'); $s.TargetPath='%DEST%\Start-HVO-Notifier.bat'; $s.WorkingDirectory='%DEST%'; $s.IconLocation='%DEST%\hvo-notifier.ico,0'; $s.WindowStyle=7; $s.Save()"

echo Installed to: %DEST%
echo Start Menu shortcut created: Hyvision One Notifier
echo Cached login cleared — please sign in again in the tray app.
echo Startup on login is NOT enabled.
echo.
pause

start "" "%DEST%\Start-HVO-Notifier.bat"
endlocal
