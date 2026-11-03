' Novel Flow launcher with no window at all - double-click to start.
' It installs / updates packages when needed, starts the app hidden and
' opens your browser once it's ready. If Novel Flow is already running it
' just opens the browser.
'
' To stop / restart, or to see logs and errors, use Novel-flow.bat.
' Projects are saved in the "saves" folder next to this file.

Option Explicit
Dim sh, fso, dir, rc
Const URL = "http://localhost:5173"
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Work from the folder this script lives in.
dir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir

' 0) Already running? Then just open it (never start a second server).
rc = sh.Run("cmd /c netstat -aon | findstr /c:"":5173 "" | findstr LISTENING >nul", 0, True)
If rc = 0 Then
  sh.Run URL
  WScript.Quit
End If

' 1) Make sure Node.js is available.
rc = sh.Run("cmd /c where node", 0, True)
If rc <> 0 Then
  MsgBox "Node.js was not found on your PC." & vbCrLf & vbCrLf & _
         "Install Node.js 18+ from https://nodejs.org," & vbCrLf & _
         "then double-click this launcher again.", 16, "Novel Flow"
  WScript.Quit
End If

' 2) Install / update packages when needed (hidden, wait until done).
'    "npm ls" fails when node_modules is missing OR when an update added
'    new packages to package.json.
rc = sh.Run("cmd /c npm ls --depth=0 >nul 2>nul", 0, True)
If rc <> 0 Then
  MsgBox "Installing / updating packages." & vbCrLf & _
         "This can take 1-2 minutes." & vbCrLf & vbCrLf & _
         "Your browser will open automatically when it's ready.", 64, "Novel Flow"
  rc = sh.Run("cmd /c npm install --no-audit --no-fund", 0, True)
  If rc <> 0 Then
    MsgBox "Installing packages failed." & vbCrLf & _
           "Double-click Novel-flow.bat to see the error.", 16, "Novel Flow"
    WScript.Quit
  End If
End If

' 3) Start the server hidden; Vite opens the browser when it's ready.
sh.Run "cmd /c npm run dev", 0, False
