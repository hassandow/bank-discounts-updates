@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==========================================
echo   بناء منظومة الخصومات المصرفية 1.0.8
echo ==========================================
where node >nul 2>nul
if errorlevel 1 (
  echo لم يتم العثور على Node.js. ثبّت Node.js LTS ثم أعد المحاولة.
  pause
  exit /b 1
)
echo جاري تثبيت مكتبات البرنامج...
call npm install
if errorlevel 1 goto error
echo جاري إنشاء ملف Setup...
call npm run dist
if errorlevel 1 goto error
echo.
echo اكتمل البناء. ستجد ملفات التثبيت وملفات التحديث داخل مجلد dist.
pause
exit /b 0
:error
echo حدث خطأ أثناء البناء. راجع الرسائل أعلاه.
pause
exit /b 1
