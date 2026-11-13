; Compile-only per-user installer. WriteUninstaller runs at installation time;
; producing this installer never executes a generated installer or application.
Unicode true
!include "MUI2.nsh"
!include "x64.nsh"
!include "LogicLib.nsh"
!ifndef APP_VERSION
 !error "APP_VERSION must be supplied by scripts/build-windows.mjs"
!endif
!ifndef APP_DIRECTORY
 !error "APP_DIRECTORY must point to the packaged Windows app"
!endif
!ifndef RELEASE_DIRECTORY
 !error "RELEASE_DIRECTORY must be supplied"
!endif
!ifndef UNINSTALL_MANIFEST
 !error "UNINSTALL_MANIFEST must be supplied"
!endif
!define APP_NAME "Cardroom Lab"
!define APP_REG "Software\Microsoft\Windows\CurrentVersion\Uninstall\CardroomLab"
Name "${APP_NAME}"
OutFile "${RELEASE_DIRECTORY}\Cardroom-Lab-Setup-${APP_VERSION}-x64.exe"
InstallDir "$LOCALAPPDATA\Programs\Cardroom Lab"
InstallDirRegKey HKCU "${APP_REG}" "InstallLocation"
RequestExecutionLevel user
SetCompressor /SOLID lzma
SetCompressorDictSize 32
ShowInstDetails show
ShowUninstDetails show
VIProductVersion "${APP_VERSION}.0"
VIAddVersionKey /LANG=1033 "ProductName" "${APP_NAME}"
VIAddVersionKey /LANG=1033 "FileDescription" "Cardroom Lab Windows installer"
VIAddVersionKey /LANG=1033 "ProductVersion" "${APP_VERSION}"
VIAddVersionKey /LANG=1033 "FileVersion" "${APP_VERSION}"
VIAddVersionKey /LANG=1033 "LegalCopyright" "Copyright 2026 Nikkilodeonee"
!define MUI_ICON "${__FILEDIR__}\assets\icon.ico"
!define MUI_UNICON "${__FILEDIR__}\assets\icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Welcome to Cardroom Lab"
!define MUI_WELCOMEPAGE_TEXT "Install the desktop blackjack and poker practice app on this PC.$\r$\n$\r$\nThe application and its runtime are included. You do not need Node.js.$\r$\n$\r$\nAutomatic screen recognition uses a separate local Ollama vision model."
!define MUI_FINISHPAGE_RUN "$INSTDIR\Cardroom Lab.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch Cardroom Lab"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
Function .onInit
 ${IfNot} ${RunningX64}
  MessageBox MB_ICONSTOP "This installer requires 64-bit Windows."
  Abort
 ${EndIf}
 SetShellVarContext current
 SetRegView 64
FunctionEnd
Section "Cardroom Lab (required)" MainSection
 SectionIn RO
 SetShellVarContext current
 SetRegView 64
 SetOutPath "$INSTDIR"
 File /r "${APP_DIRECTORY}\*.*"
 WriteUninstaller "$INSTDIR\Uninstall Cardroom Lab.exe"
 CreateShortcut "$SMPROGRAMS\Cardroom Lab.lnk" "$INSTDIR\Cardroom Lab.exe"
 WriteRegStr HKCU "${APP_REG}" "DisplayName" "Cardroom Lab"
 WriteRegStr HKCU "${APP_REG}" "DisplayVersion" "${APP_VERSION}"
 WriteRegStr HKCU "${APP_REG}" "Publisher" "Nikkilodeonee"
 WriteRegStr HKCU "${APP_REG}" "InstallLocation" "$INSTDIR"
 WriteRegStr HKCU "${APP_REG}" "DisplayIcon" "$INSTDIR\Cardroom Lab.exe,0"
 WriteRegStr HKCU "${APP_REG}" "UninstallString" '$\"$INSTDIR\Uninstall Cardroom Lab.exe$\"'
 WriteRegStr HKCU "${APP_REG}" "QuietUninstallString" '$\"$INSTDIR\Uninstall Cardroom Lab.exe$\" /S'
 WriteRegDWORD HKCU "${APP_REG}" "NoModify" 1
 WriteRegDWORD HKCU "${APP_REG}" "NoRepair" 1
SectionEnd
Section "Desktop shortcut" DesktopShortcut
 SetShellVarContext current
 CreateShortcut "$DESKTOP\Cardroom Lab.lnk" "$INSTDIR\Cardroom Lab.exe"
SectionEnd
Section "Uninstall"
 SetShellVarContext current
 SetRegView 64
 ; Exact packaged filenames only. Never recursively delete an arbitrary install folder.
 !include "${UNINSTALL_MANIFEST}"
 Delete "$INSTDIR\Uninstall Cardroom Lab.exe"
 Delete "$SMPROGRAMS\Cardroom Lab.lnk"
 Delete "$DESKTOP\Cardroom Lab.lnk"
 DeleteRegKey HKCU "${APP_REG}"
 RMDir "$INSTDIR"
SectionEnd
