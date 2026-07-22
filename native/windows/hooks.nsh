!macro KillFleetSidecars
  DetailPrint "Stopping Disk Usage MCP and backend..."
  !if "${INSTALLMODE}" == "currentUser"
    nsis_tauri_utils::KillProcessCurrentUser "disk-usage-mcp-backend.exe"
    Pop $0
    nsis_tauri_utils::KillProcessCurrentUser "disk-usage-mcp-native.exe"
    Pop $0
  !else
    nsis_tauri_utils::KillProcess "disk-usage-mcp-backend.exe"
    Pop $0
    nsis_tauri_utils::KillProcess "disk-usage-mcp-native.exe"
    Pop $0
  !endif
  Sleep 1500
!macroend

!macro NSIS_HOOK_PREINSTALL
  !insertmacro KillFleetSidecars
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  !insertmacro KillFleetSidecars
!macroend
