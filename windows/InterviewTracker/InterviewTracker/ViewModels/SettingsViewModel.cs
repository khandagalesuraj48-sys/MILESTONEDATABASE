using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using System.Text.Json;

namespace InterviewTracker.ViewModels;

public partial class SettingsViewModel : ObservableObject
{
    [ObservableProperty] private string _apiBaseUrl = "";
    [ObservableProperty] private string _whatsAppNumber = "918452845537";
    [ObservableProperty] private int _maxFileSizeMb = 20;

    [ObservableProperty] private bool _isTestingConnection;
    [ObservableProperty] private bool _hasTestResult;
    [ObservableProperty] private bool _isTestSuccess;
    [ObservableProperty] private string _testResultTitle = "";
    [ObservableProperty] private string _testResultMessage = "";

    [ObservableProperty] private string _appVersion = "2.0.0";
    [ObservableProperty] private string _dotNetVersion = Environment.Version.ToString();
    [ObservableProperty] private string _osVersion = Environment.OSVersion.ToString();

    public void LoadSettings()
    {
        ApiBaseUrl = App.SettingsService.ApiBaseUrl;
        WhatsAppNumber = App.SettingsService.WhatsAppNumber;
        MaxFileSizeMb = App.SettingsService.MaxFileSizeMb;
    }

    [RelayCommand]
    public async Task TestConnectionAsync()
    {
        IsTestingConnection = true;
        HasTestResult = false;

        try
        {
            var result = await App.ApiService.GetBootstrapAsync();
            if (result.Success && result.Data != null)
            {
                IsTestSuccess = true;
                TestResultTitle = "Connection Successful";
                TestResultMessage = $"Connected to Google Apps Script backend v{result.Data.Version}. Server date: {result.Data.Date}";
            }
            else
            {
                IsTestSuccess = false;
                TestResultTitle = "Connection Failed";
                TestResultMessage = result.Error ?? "Could not reach the backend API.";
            }
        }
        catch (Exception ex)
        {
            IsTestSuccess = false;
            TestResultTitle = "Connection Error";
            TestResultMessage = ex.Message;
        }
        finally
        {
            HasTestResult = true;
            IsTestingConnection = false;
        }
    }
}

