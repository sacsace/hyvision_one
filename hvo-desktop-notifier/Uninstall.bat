@echo off
setlocal
set "DEST=%LOCALAPPDATA%\HVO-Notifier"
set "STARTMENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Hyvision One Notifier.lnk"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Hyvision One Notifier.lnk"

taskkill /F /FI "WINDOWTITLE eq Hyvision One Notifier*" >nul 2>&1

if exist "%STARTMENU%" del /F /Q "%STARTMENU%"
if exist "%STARTUP%" del /F /Q "%STARTUP%"
if exist "%DEST%" rmdir /S /Q "%DEST%"

echo Uninstalled Hyvision One Notifier.
pause
endlocal
