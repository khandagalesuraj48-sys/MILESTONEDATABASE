# Windows Build Guide

## Prerequisites

| Requirement | Version |
|---|---|
| Visual Studio 2022 | 17.8+ (Community / Professional / Enterprise) |
| Windows App SDK workload | 1.5+ |
| .NET SDK | 8.0+ |
| Windows OS | Windows 10 version 1903 (build 19041) or later |

---

## 1. Install Prerequisites

### 1.1 Visual Studio 2022

Download from: https://visualstudio.microsoft.com/downloads/

During installation, select these workloads:
- **.NET desktop development**
- **Windows application development** (includes WinUI 3 tools)

### 1.2 Windows App SDK Runtime

If the app fails to start on a user machine without Visual Studio, download the runtime:
https://github.com/microsoft/WindowsAppSDK/releases

Download the `WindowsAppRuntimeInstall-x64.exe` or `.msix` bundle.

---

## 2. Configure the App

### 2.1 Set the API URL

Edit `windows/InterviewTracker/InterviewTracker/appsettings.json`:

```json
{
  "ApiBaseUrl": "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec",
  "WhatsAppNumber": "918452845537",
  "MaxFileSizeMb": 20
}
```

Replace `YOUR_DEPLOYMENT_ID` with your actual Apps Script deployment ID (see SETUP.md).

---

## 3. Open the Project

1. Open Visual Studio 2022
2. **File → Open → Project/Solution**
3. Navigate to: `c:\Users\aghug\Desktop\WEBSITE AND APP\Interview tracker\windows\InterviewTracker`
4. Select `InterviewTracker.sln`
5. Click **Open**

---

## 4. Build Debug

### Via Visual Studio

1. Set configuration to **Debug** and platform to **x64**
2. Press **F5** or **Debug → Start Debugging**

### Via Command Line (PowerShell)

```powershell
cd "c:\Users\aghug\Desktop\WEBSITE AND APP\Interview tracker\windows\InterviewTracker"
dotnet build InterviewTracker.sln --configuration Debug
```

### Run the App

```powershell
dotnet run --project InterviewTracker\InterviewTracker.csproj
```

---

## 5. Build Release

### Via Visual Studio

1. Set configuration to **Release**, platform to **x64**
2. **Build → Build Solution**

Output: `InterviewTracker\bin\x64\Release\net8.0-windows10.0.19041.0\`

### Via Command Line

```powershell
dotnet build InterviewTracker.sln --configuration Release --runtime win-x64
```

### Publish as Self-Contained EXE

```powershell
dotnet publish InterviewTracker\InterviewTracker.csproj `
  --configuration Release `
  --runtime win-x64 `
  --self-contained true `
  -p:PublishSingleFile=true `
  --output "publish\"
```

Output: `publish\InterviewTracker.exe`

---

## 6. Package as MSIX (for distribution)

### 6.1 Create a Certificate (self-signed for testing)

```powershell
New-SelfSignedCertificate `
  -Type Custom `
  -Subject "CN=InterviewTracker" `
  -KeyUsage DigitalSignature `
  -FriendlyName "Interview Tracker" `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}")
```

Note the Thumbprint output.

### 6.2 Configure Signing in Package.appxmanifest

In `Package.appxmanifest`, ensure the publisher matches your certificate.

### 6.3 Build MSIX

In Visual Studio:
1. Right-click project → **Publish** → **Create App Packages**
2. Choose **Sideloading** (or Store if publishing to Microsoft Store)
3. Select your certificate
4. Follow the wizard

### 6.4 Install MSIX

```powershell
Add-AppPackage -Path "path\to\InterviewTracker.msix"
```

---

## 7. Project Structure

```
windows/InterviewTracker/
├── InterviewTracker.sln
└── InterviewTracker/
    ├── InterviewTracker.csproj
    ├── App.xaml / App.xaml.cs
    ├── appsettings.json          ← API URL configuration
    ├── Models/                   ← Data models
    ├── Services/                 ← HTTP + settings services
    ├── ViewModels/               ← MVVM ViewModels
    ├── Views/                    ← XAML pages + code-behind
    ├── Converters/               ← XAML value converters
    ├── Helpers/                  ← File picker, WhatsApp, validation
    ├── Assets/                   ← App icons
    └── Package.appxmanifest
```

---

## 8. Key Dependencies

| Package | Purpose |
|---|---|
| `Microsoft.WindowsAppSDK` | WinUI 3 framework |
| `CommunityToolkit.Mvvm` | ObservableObject, RelayCommand |
| `CommunityToolkit.WinUI.Controls` | DataGrid, other controls |
| `Microsoft.Extensions.Configuration` | appsettings.json |
| `System.Text.Json` | JSON serialization |

---

## 9. PDF File Picker

The Windows app uses `Windows.Storage.Pickers.FileOpenPicker`:

```csharp
var picker = new FileOpenPicker();
picker.FileTypeFilter.Add(".pdf");
var file = await picker.PickSingleFileAsync();
```

This opens the native Windows file picker dialog. No special permissions needed.

---

## 10. Common Issues

### "The type initializer for 'WinRT.ComWrappersSupport' threw an exception"
→ Install Windows App SDK runtime. Download from GitHub releases.

### App won't start on Windows 10
→ Ensure Windows 10 version 1903 (build 19041) or later. Check: `winver` in Run dialog.

### "Unable to find package Microsoft.WindowsAppSDK"
→ Add NuGet source: `https://api.nuget.org/v3/index.json`

### MSIX install fails
→ Enable Developer Mode: Settings → Update & Security → Developer Mode → ON

### "API returns 302 redirect"
→ The HttpClient needs to follow redirects. `AllowAutoRedirect = true` is set in `ApiService.cs`.

### PDF file too large
→ Maximum is 20 MB. The app validates before sending.

---

## 11. Running Tests

```powershell
dotnet test InterviewTracker.Tests\InterviewTracker.Tests.csproj
```

---

## 12. .gitignore Additions

```
windows/InterviewTracker/InterviewTracker/bin/
windows/InterviewTracker/InterviewTracker/obj/
windows/InterviewTracker/.vs/
*.user
```

---

## 13. System Requirements (End User)

| Component | Requirement |
|---|---|
| OS | Windows 10 version 1903 or later (build 19041+) |
| Architecture | x64 |
| RAM | 256 MB minimum |
| Disk | 100 MB free |
| Internet | Required for API calls |
| Windows App SDK | 1.5 Runtime (auto-installed with MSIX) |

