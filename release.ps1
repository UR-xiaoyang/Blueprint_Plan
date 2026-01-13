# Blueprint Plan GitHub Release Script
# 使用 UTF-8 编码

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "     Blueprint Plan GitHub 发布脚本" -ForegroundColor Cyan
Write-Host "=========================================="
Write-Host ""

# 1. 获取提交信息
do {
    $msg = Read-Host "请输入提交信息 (Commit message)"
    if ([string]::IsNullOrWhiteSpace($msg)) {
        Write-Host "提交信息不能为空，请重新输入。" -ForegroundColor Yellow
    }
} while ([string]::IsNullOrWhiteSpace($msg))

Write-Host ""

# 2. 获取标签
$tag = Read-Host "请输入标签 (Tag, 例如 v0.4.1) [直接回车跳过]"

$retag = "n"
if (-not [string]::IsNullOrWhiteSpace($tag)) {
    $retagInput = Read-Host "是否覆盖已存在的同名标签 $tag ? (y/n) [默认 n]"
    if ($retagInput -eq "y") {
        $retag = "y"
    }
}

Write-Host ""
Write-Host "[1/4] 正在添加所有更改 (git add .)..." -ForegroundColor Green
git add .

Write-Host ""
Write-Host "[2/4] 正在提交更改 (git commit)..." -ForegroundColor Green
git commit -m "$msg"

Write-Host ""
Write-Host "[3/4] 正在推送到远程仓库 (git push)..." -ForegroundColor Green
git push

if (-not [string]::IsNullOrWhiteSpace($tag)) {
    Write-Host ""
    Write-Host "[4/4] 正在处理标签 $tag ..." -ForegroundColor Green

    if ($retag -eq "y") {
        Write-Host "正在尝试删除旧标签（本地及远程）..." -ForegroundColor Yellow
        git tag -d $tag 2>$null
        git push origin ":refs/tags/$tag" 2>$null
    }

    git tag $tag
    git push origin $tag
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "                操作完成" -ForegroundColor Cyan
Write-Host "=========================================="
Write-Host "按任意键退出..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
