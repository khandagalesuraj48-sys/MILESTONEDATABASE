using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using InterviewTracker.Models;
using InterviewTracker.Helpers;

namespace InterviewTracker.ViewModels;

public partial class CandidateDetailViewModel : ObservableObject
{
    [ObservableProperty] private bool _isLoading;
    [ObservableProperty] private string _errorMessage = "";
    [ObservableProperty] private bool _hasError;
    [ObservableProperty] private Candidate? _candidate;

    public event Action<string>? NavigateToEdit;
    public event Action? GoBack;

    [RelayCommand]
    public async Task LoadCandidateAsync(string interviewId)
    {
        IsLoading = true;
        HasError = false;
        ErrorMessage = "";

        var result = await App.ApiService.GetCandidateAsync(interviewId);

        if (result.Success && result.Data != null)
        {
            Candidate = result.Data;
        }
        else
        {
            HasError = true;
            ErrorMessage = result.Error ?? "Failed to load candidate details.";
        }

        IsLoading = false;
    }

    [RelayCommand]
    public void EditCandidate()
    {
        if (Candidate != null)
            NavigateToEdit?.Invoke(Candidate.InterviewId);
    }

    [RelayCommand]
    public async Task OpenResumeAsync()
    {
        if (Candidate == null || string.IsNullOrWhiteSpace(Candidate.ResumeUrl)) return;
        await Windows.System.Launcher.LaunchUriAsync(new Uri(Candidate.ResumeUrl));
    }

    [RelayCommand]
    public async Task OpenWhatsAppAsync()
    {
        if (Candidate == null) return;
        await WhatsAppHelper.OpenWhatsAppForCandidateAsync(Candidate);
    }

    [RelayCommand]
    public void Back() => GoBack?.Invoke();
}

