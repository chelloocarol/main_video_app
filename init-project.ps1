# init-project.ps1
# Initialize project structure for video enhancement web application

Write-Host "Initializing project directories..." -ForegroundColor Cyan

# Backend directories
New-Item -ItemType Directory -Path "backend\app" -Force | Out-Null
New-Item -ItemType Directory -Path "backend\tests" -Force | Out-Null

# Frontend directories
New-Item -ItemType Directory -Path "frontend\src\components" -Force | Out-Null
New-Item -ItemType Directory -Path "frontend\src\pages" -Force | Out-Null
New-Item -ItemType Directory -Path "frontend\src\services" -Force | Out-Null
New-Item -ItemType Directory -Path "frontend\src\store" -Force | Out-Null

# Docs
New-Item -ItemType Directory -Path "docs" -Force | Out-Null

Write-Host "Directories created successfully." -ForegroundColor Green


# Create backend files
New-Item -ItemType File -Path "backend\app\main.py" -Force | Out-Null
Set-Content -Path "backend\app\main.py" -Value "# main.py - FastAPI entry point" -Encoding UTF8

New-Item -ItemType File -Path "backend\app\auth.py" -Force | Out-Null
Set-Content -Path "backend\app\auth.py" -Value "# auth.py - authentication logic" -Encoding UTF8

New-Item -ItemType File -Path "backend\app\video_stream_manager.py" -Force | Out-Null
Set-Content -Path "backend\app\video_stream_manager.py" -Value "# video_stream_mananger.py - video stream handling" -Encoding UTF8

New-Item -ItemType File -Path "backend\app\video_enhance.py" -Force | Out-Null
Set-Content -Path "backend\app\video_enhance.py" -Value "# video_enhance.py - video enhancement functions" -Encoding UTF8

New-Item -ItemType File -Path "backend\app\params.py" -Force | Out-Null
Set-Content -Path "backend\app\params.py" -Value "# params.py - configuration parameters" -Encoding UTF8

New-Item -ItemType File -Path "backend\app\__init__.py" -Force | Out-Null
Set-Content -Path "backend\app\__init__.py" -Value "# __init__.py - package init" -Encoding UTF8

New-Item -ItemType File -Path "backend\app\templates\index_dev.html" -Force | Out-Null
Set-Content -Path "backend\app\templates\index_dev.html" -Value "# index_dev.html - " -Encoding UTF8

New-Item -ItemType File -Path "backend\utils\logger.py" -Force | Out-Null
Set-Content -Path "backend\utils\logger.py" -Value "# logger" -Encoding UTF8

New-Item -ItemType File -Path "backend\tests\__init__.py" -Force | Out-Null
Set-Content -Path "backend\tests\__init__.py" -Value "# init test package" -Encoding UTF8

New-Item -ItemType File -Path "backend\requirements.txt" -Force | Out-Null
Set-Content -Path "backend\requirements.txt" -Value "# requirements.txt - Python dependencies" -Encoding UTF8

New-Item -ItemType File -Path "backend\Dockerfile" -Force | Out-Null
Set-Content -Path "backend\Dockerfile" -Value "# Dockerfile for backend" -Encoding UTF8


# Create frontend files
New-Item -ItemType File -Path "frontend\src\main.jsx" -Force | Out-Null
Set-Content -Path "frontend\src\main.jsx" -Value "// main.jsx - React entry point" -Encoding UTF8

New-Item -ItemType File -Path "frontend\src\App.jsx" -Force | Out-Null
Set-Content -Path "frontend\src\App.jsx" -Value "// App.jsx - Main React component" -Encoding UTF8

New-Item -ItemType File -Path "frontend\vite.config.ts" -Force | Out-Null
Set-Content -Path "frontend\vite.config.ts" -Value "// vite.config.ts - Vite configuration" -Encoding UTF8

New-Item -ItemType File -Path "frontend\package.json" -Force | Out-Null
Set-Content -Path "frontend\package.json" -Value "// package.json - NPM dependencies" -Encoding UTF8

# Empty placeholder files
New-Item -ItemType File -Path "frontend\src\store\.gitkeep" -Force | Out-Null
Set-Content -Path "frontend\src\store\.gitkeep" -Value "// keep store folder" -Encoding UTF8

New-Item -ItemType File -Path "frontend\src\services\.gitkeep" -Force | Out-Null
Set-Content -Path "frontend\src\services\.gitkeep" -Value "// keep services folder" -Encoding UTF8


# Docs
New-Item -ItemType File -Path "docs\development_doc.md" -Force | Out-Null
Set-Content -Path "docs\development_doc.md" -Value "# Development documentation" -Encoding UTF8


# Root-level files
New-Item -ItemType File -Path "docker-compose.yml" -Force | Out-Null
Set-Content -Path "docker-compose.yml" -Value "# docker-compose.yml for backend + frontend" -Encoding UTF8

New-Item -ItemType File -Path ".gitignore" -Force | Out-Null
Set-Content -Path ".gitignore" -Value "# .gitignore - ignore temp files" -Encoding UTF8


Write-Host "Project initialization complete!" -ForegroundColor Green
