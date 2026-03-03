; 부동산 관리 시스템 원클릭 설치 파일
; Inno Setup 스크립트

#define MyAppName "부동산 관리 시스템"
#define MyAppVersion "1.0"
#define MyAppPublisher "부동산 관리"
#define MyAppURL ""
#define MyAppExeName "start_server.bat"

[Setup]
; 설치 파일 기본 정보
AppId={{F8B8D9E4-5A3C-4D7E-9F1A-2B3C4D5E6F7A}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName=C:\code1\realestate-management
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
; 설치 완료 후 바로 실행하지 않음 (사용자가 직접 실행)
; UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma
SolidCompression=yes
WizardStyle=modern
OutputDir=installer_output
OutputBaseFilename=부동산관리시스템_설치
; 한국어 지원
SetupIconFile=
PrivilegesRequired=lowest
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "korean"; MessagesFile: "compiler:Languages\Korean.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1

[Files]
; 모든 Python 소스 파일 (캐시 파일 제외)
Source: "app\*"; DestDir: "{app}\app"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "__pycache__\*,*.pyc,*.pyo"
; 데이터 폴더 (빈 구조 포함)
Source: "data\*"; DestDir: "{app}\data"; Flags: ignoreversion recursesubdirs createallsubdirs
; 정적 파일
Source: "app\static\*"; DestDir: "{app}\app\static"; Flags: ignoreversion recursesubdirs createallsubdirs
; 루트 파일들
Source: "run.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "requirements.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "duckdns_updater.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "ssl_auto_renew.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "start_server.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "setup_new_computer.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "start_https_server_cmd.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "start_server_with_ssl.bat"; DestDir: "{app}"; Flags: ignoreversion
; 민감한 정보 포함 파일들
Source: ".env"; DestDir: "{app}"; Flags: ignoreversion; Attribs: hidden
Source: "service_account.json"; DestDir: "{app}"; Flags: ignoreversion
; 문서 파일
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion isreadme
Source: "SETUP_GUIDE.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "CODING_STANDARDS.md"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{sys}\shell32.dll"; IconIndex: 13
Name: "{group}\초기 설정"; Filename: "{app}\setup_new_computer.bat"; WorkingDir: "{app}"; IconFilename: "{sys}\shell32.dll"; IconIndex: 25
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{sys}\shell32.dll"; IconIndex: 13; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{sys}\shell32.dll"; IconIndex: 13; Tasks: quicklaunchicon

[Run]
; 설치 후 초기 설정 스크립트 자동 실행 (원클릭 설치)
Filename: "{app}\setup_new_computer.bat"; Description: "초기 설정 자동 실행 (가상환경 생성 및 패키지 설치)"; Flags: nowait postinstall runascurrentuser; StatusMsg: "초기 설정을 실행하는 중..."

[UninstallDelete]
; 제거 시 가상환경 폴더도 삭제 (선택사항)
Type: filesandordirs; Name: "{app}\venv"
Type: filesandordirs; Name: "{app}\__pycache__"
Type: filesandordirs; Name: "{app}\app\__pycache__"
Type: filesandordirs; Name: "{app}\*.pyc"
Type: filesandordirs; Name: "{app}\*.pyo"

[Code]
procedure InitializeWizard;
begin
  WizardForm.WelcomeLabel1.Caption := '부동산 관리 시스템을 설치합니다.';
  WizardForm.WelcomeLabel2.Caption := '원클릭 설치:' + #13#10 +
    '- Python 3.8 이상이 설치되어 있어야 합니다.' + #13#10 +
    '- 설치 후 자동으로 초기 설정이 실행됩니다.' + #13#10 +
    '- 모든 설정이 완료되면 바로 사용할 수 있습니다.';
end;

function InitializeSetup(): Boolean;
var
  PythonVersion: String;
  ResultCode: Integer;
begin
  Result := True;
  // Python 설치 확인
  if Exec('python', '--version', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    // Python이 설치되어 있음
    Result := True;
  end
  else
  begin
    // Python이 설치되어 있지 않음
    if MsgBox('Python이 설치되어 있지 않습니다.' + #13#10 + #13#10 +
              'Python 3.8 이상을 먼저 설치해야 합니다.' + #13#10 + #13#10 +
              'Python 다운로드 페이지를 열까요?', mbConfirmation, MB_YESNO) = IDYES then
    begin
      ShellExec('open', 'https://www.python.org/downloads/', '', '', SW_SHOWNORMAL, ewNoWait, ResultCode);
    end;
    Result := True; // 설치를 계속 진행하도록 함 (Python이 나중에 설치되어도 됨)
  end;
end;
