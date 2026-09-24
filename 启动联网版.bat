@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ============================================
echo   剑与魔法命运编年史 - 本机小桥（可选）
echo ============================================
echo.
echo [不必需] 平时直接双击「剑与魔法命运编年史.html」，
echo          底部点「AI 设置」→ 选 DeepSeek 官方 → 粘 sk- 开头的 Key，
echo          就能用官方后台，本脚本完全不用跑。
echo.
echo [什么时候用它] 想把 Key 留在服务端（不落到浏览器里），
echo                或者要让别的设备通过一个网址进来玩。
echo.

rem 1) 先确认成品在不在
if not exist "剑与魔法命运编年史.html" (
  echo [提示] 还没有成品文件，正在调用 python build.py 生成...
  python build.py || goto :fail
)

rem 2) 找 node：先看 PATH，再看常见位置
set NODE=
where node >nul 2>nul && set NODE=node
if "%NODE%"=="" if exist "D:\node.exe" set NODE=D:\node.exe
if "%NODE%"=="" if exist "%ProgramFiles%\nodejs\node.exe" set NODE="%ProgramFiles%\nodejs\node.exe"
if "%NODE%"=="" (
  echo [错误] 没找到 node.exe。装一个 Node.js 18 以上版本，或把 node.exe 放到 D:\ 下。
  goto :fail
)

rem 3) 没有 Key 就提示怎么配
findstr /c:"sk-" server\config.json >nul 2>nul
if errorlevel 1 (
  if "%DEEPSEEK_API_KEY%"=="" (
    echo [提示] 还没配 DeepSeek API Key：
    echo        把 server\config.example.json 复制成 server\config.json，
    echo        填进 "apiKey": "sk-..."，或者先设环境变量 DEEPSEEK_API_KEY。
    echo        不配也能开：网页会走离线模板，功能完全可用。
    echo.
  )
)

echo [1/2] 启动服务器（关掉这个窗口就等于关掉服务）
start "" http://127.0.0.1:8787/
%NODE% server\server.js
goto :eof

:fail
echo.
pause
