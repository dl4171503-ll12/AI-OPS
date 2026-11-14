# 启动/重启本地语音识别服务（Vosk，8201）
# 用法：右键“使用 PowerShell 运行”，或在终端执行 powershell -ExecutionPolicy Bypass -File scripts\start-asr.ps1
$py = 'C:\Users\David\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe'
$root = 'D:\Desktop\app-cjxeruyihxxd\ai-school'
$model = 'D:\Desktop\ai-school-models\vosk-model-small-en-us-0.15'
$log = 'D:\Desktop\ai-school-models\local_asr.log'

$busy = (Test-NetConnection -ComputerName 127.0.0.1 -Port 8201 -WarningAction SilentlyContinue).TcpTestSucceeded
if ($busy) { Write-Host '本地识别服务已在运行：http://127.0.0.1:8201'; exit 0 }

if (-not (Test-Path $model)) { Write-Host "缺少模型：$model"; exit 1 }

$env:VOSK_MODEL_DIR = $model
Start-Process -FilePath $py -ArgumentList @('scripts\local_asr.py') -WorkingDirectory $root `
  -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError ($log + '.err')
Start-Sleep -Seconds 4
$ok = (Test-NetConnection -ComputerName 127.0.0.1 -Port 8201 -WarningAction SilentlyContinue).TcpTestSucceeded
if ($ok) { Write-Host '本地识别服务已启动：http://127.0.0.1:8201' } else { Write-Host '启动失败，查看日志：' + $log + '.err' }
