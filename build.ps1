if (Test-Path WallpaperAlive)
{
    Remove-Item WallpaperAlive -Recurse -Force
}
mkdir WallpaperAlive

Copy-Item 'static_global' -Destination 'WallpaperAlive' -Recurse -Force
Remove-Item .\WallpaperAlive\static_global\.config

cd .\wallpaper_service
#Run these if remaking c++ files
#npm run compile
#npm run rebuild
npm run build
cd ..
mkdir .\WallpaperAlive\wallpaper_service
Move-Item -Path .\WallpaperAlive\WallpaperAlive-win32-x64\* -Destination .\WallpaperAlive\wallpaper_service -Force
Remove-Item .\WallpaperAlive\WallpaperAlive-win32-x64 -Force
Remove-Item .\WallpaperAlive\wallpaper_service\resources\app\bin -Recurse -Force
Remove-Item .\WallpaperAlive\wallpaper_service\resources\app\windows_service\windows_service.cc -Force
Remove-Item .\WallpaperAlive\wallpaper_service\resources\app\binding.gyp -Force
(Get-Content .\WallpaperAlive\wallpaper_service\resources\app\index.html -Raw) -replace '\.\.\/','../../../' | Set-Content .\WallpaperAlive\wallpaper_service\resources\app\index.html

cd .\config_service
#npm run compile
#npm run rebuild
npm run build
cd ..
mkdir .\WallpaperAlive\config_service
Move-Item -Path .\WallpaperAlive\WallpaperAliveMenu-win32-x64\* -Destination .\WallpaperAlive\config_service -Force
Remove-Item .\WallpaperAlive\WallpaperAliveMenu-win32-x64 -Force
Remove-Item .\WallpaperAlive\config_service\resources\app\bin -Recurse -Force
Remove-Item .\WallpaperAlive\config_service\resources\app\steam_service -Recurse -Force
Remove-Item .\WallpaperAlive\config_service\resources\app\binding.gyp -Force
Move-Item -Path .\WallpaperAlive\config_service\resources\app\steam_appid.txt -Destination .\WallpaperAlive\config_service -Force
cd .\WallpaperAlive\config_service\resources\app\templates
(Get-Content .\index.html -Raw) -replace '\.\.\/\.\.\/','../../../../' | Set-Content .\index.html
(Get-Content .\splash.html -Raw) -replace '\.\.\/\.\.\/','../../../../' | Set-Content .\splash.html
cd sub_pages
(Get-Content .\browse.html -Raw) -replace '\.\.\/\.\.\/\.\.\/','../../../../../' | Set-Content .\browse.html
(Get-Content .\bugs.html -Raw) -replace '\.\.\/\.\.\/\.\.\/','../../../../../' | Set-Content .\bugs.html
(Get-Content .\donate.html -Raw) -replace '\.\.\/\.\.\/\.\.\/','../../../../../' | Set-Content .\donate.html
(Get-Content .\publisher.html -Raw) -replace '\.\.\/\.\.\/\.\.\/','../../../../../' | Set-Content .\publisher.html
(Get-Content .\settings.html -Raw) -replace '\.\.\/\.\.\/\.\.\/','../../../../../' | Set-Content .\settings.html
cd ..\..\..\..\..\..\