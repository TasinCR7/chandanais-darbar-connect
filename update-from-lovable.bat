@echo off
color 0A
echo ========================================================
echo        Syncing Updates from Lovable to Website
echo ========================================================
echo.

:: Add lovable remote if it doesn't exist
git remote add lovable https://github.com/TasinCR7/chandanais-darbar-connect-4ca30118.git 2>nul

:: Fetch the latest changes from Lovable
echo [1/3] Fetching new code from Lovable...
git fetch lovable main

:: Attempt to merge
echo [2/3] Merging updates into your website...
git merge lovable/main --no-edit

:: Check if the merge failed due to conflicts
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    echo MARGE CONFLICT DETECTED!
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    echo Lovable's new code conflicted with your custom code.
    echo Please resolve the red conflict markers in VS Code, 
    echo then manually run: git commit  and  git push
    echo.
    pause
    exit /b %ERRORLEVEL%
)

:: Push to remote (triggers Vercel deploy)
echo [3/3] Uploading the updated code to GitHub/Vercel...
git push origin main

echo.
echo ========================================================
echo SUCCESS! Your website is now fully updated!
echo Vercel will process this and deploy it within 1-2 minutes.
echo ========================================================
echo.
pause
