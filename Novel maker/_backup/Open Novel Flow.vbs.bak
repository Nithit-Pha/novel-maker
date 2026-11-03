' Novel Flow launcher — double-click to start the app with no console window.
' It installs dependencies on first run, starts the dev server hidden, and
' lets Vite open your browser automatically once it's ready.

Option Explicit
Dim sh, fso, dir, rc
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Work from the folder this script lives in.
dir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir

' 1) Make sure Node.js is available.
rc = sh.Run("cmd /c where node", 0, True)
If rc <> 0 Then
  MsgBox "Node.js was not found on your PC." & vbCrLf & vbCrLf & _
         "Install Node.js 18+ from https://nodejs.org," & vbCrLf & _
         "then double-click this launcher again.", 16, "Novel Flow"
  WScript.Quit
End If

' 2) First launch: install dependencies (hidden, wait until done).
If Not fso.FolderExists(dir & "\node_modules") Then
  MsgBox "First launch: installing dependencies." & vbCrLf & _
         "This can take 1-2 minutes." & vbCrLf & vbCrLf & _
         "Your browser will open automatically when it's ready.", 64, "Novel Flow"
  rc = sh.Run("cmd /c npm install", 0, True)
  If rc <> 0 Then
    MsgBox "Dependency install failed. Try running install-and-run.bat once to see the error.", 16, "Novel Flow"
    WScript.Quit
  End If
End If

' 3) Start the dev server hidden; Vite opens the browser when ready.
sh.Run "cmd /c npm run dev -- --open", 0, False
