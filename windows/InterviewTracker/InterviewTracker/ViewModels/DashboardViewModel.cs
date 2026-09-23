using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using InterviewTracker.Models;
using InterviewTracker.Helpers;

namespace InterviewTracker.ViewModels;

public partial class DashboardViewModel : ObservableObject
{
    [ObservableProperty]
    private bool _isLoading;

    [ObservableProperty]
    private string _errorMessage = "";

    [ObservableProperty]
    private bool _hasError;

    [ObservableProperty]
    private int _totalCount;

    [ObservableProperty]
    private int _selectedCount;

    [ObservableProperty]
    private int _rejectedCount;

    [ObservableProperty]
    private int _pendingCount;

    [ObservableProperty]
    private List<Candidate> _recentCandidates = new();

    [ObservableProperty]
    private string _lastRefreshed = "";

    public event Action<string>? NavigateToDetail;
    public event Action<string>? NavigateToEdit;
    public event Action<Candidate>? OpenWhatsApp;

    [RelayCommand]
    public async Task LoadDashboardAsync()
    {
        IsLoading = true;
        HasError = false;
        ErrorMessage = "";

        var result = await App.ApiService.GetDashboardAsync();

        if (result.Success && result.Data != null)
        {
            TotalCount = result.Data.Total;
            SelectedCount = result.Data.Selected;
            RejectedCount = result.Data.Rejected;
            PendingCount = result.Data.Pending;
            RecentCandidates = result.Data.Candidates ?? new();
            LastRefreshed = $"Last refreshed: {DateTime.Now:hh:mm tt}";
        }
        else
        {
            HasError = true;
            ErrorMessage = result.Error ?? "Failed to load dashboard data.";
        }

        IsLoading = false;
    }

    [RelayCommand]
    public void ViewCandidate(string interviewId)
        => NavigateToDetail?.Invoke(interviewId);

    [RelayCommand]
    public void EditCandidate(string interviewId)
        => NavigateToEdit?.Invoke(interviewId);

    [RelayCommand]
    public async Task OpenWhatsAppForCandidateAsync(Candidate candidate)
    {
        if (candidate == null) return;
        await WhatsAppHelper.OpenWhatsAppForCandidateAsync(candidate);
    }
}

