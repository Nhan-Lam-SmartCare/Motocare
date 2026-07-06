@echo off
:: ============================================================================
:: THIẾT LẬP SAO LƯU TỰ ĐỘNG HÀNG NGÀY CHO MOTOCARE
:: Chạy tập lệnh này để lập lịch sao lưu vào lúc 23:00 hàng ngày
:: ============================================================================

echo Dang thiet lap lich sao luu tu dong (Windows Task Scheduler)...

:: Ten Task
set TASK_NAME=Motocare_Auto_Backup

:: Path toi file mjs. Luu y: dung duong dan tuyet doi cua o dia hien tai
set SCRIPT_PATH=%~dp0scripts\maintenance\export-all-tables.mjs

:: Tao Task Scheduler chay luc 23:00 (11:00 PM) hang ngay
schtasks /create /tn "%TASK_NAME%" /tr "node \"%SCRIPT_PATH%\"" /sc daily /st 23:00 /f

if %errorlevel% equ 0 (
    echo.
    echo ============================================================================
    echo [OK] Da thiet lap lich sao luu tu dong thanh cong!
    echo He thong se tu dong tai sao luu va luu vao thu muc "backups" luc 23:00 hang ngay.
    echo ============================================================================
) else (
    echo.
    echo [LOI] Khong the thiet lap Task Scheduler. Vui long chay bat bang quyen Administrator (Run as Administrator).
)

pause
