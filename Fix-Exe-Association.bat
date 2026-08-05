@echo off
:: Windows Executable File Association Reset Script
echo Resetting Windows .exe File Association...
reg delete "HKCU\Software\Classes\.exe" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.exe\UserChoice" /f >nul 2>&1
echo Done! .exe file association restored to default Windows executable runner.
pause
