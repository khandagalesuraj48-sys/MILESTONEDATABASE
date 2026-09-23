using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using InterviewTracker.Models;
using InterviewTracker.Helpers;
using System.Collections.ObjectModel;

namespace InterviewTracker.ViewModels;

public partial class CandidatesViewModel : ObservableObject
{
    [ObservableProperty]
    private bool _isLoading;

    [ObservableProperty]
    private string _errorMessage = "";

    [ObservableProperty]
    private bool _hasError;

    [ObservableProperty]
    private string _searchText = "";

    [ObservableProperty]
    private string _selectedStatus = "All";

    [ObservableProperty]
    private string _selectedPosition = "All";

    [ObservableProperty]
    private ObservableCollection<Candidate> _filteredCandidates = new();

    [ObservableProperty]
    private int _recordCount;

    [ObservableProperty]
    private string _lastRefreshed = "";

    private List<Candidate> _allCandidates = new();

    public List<string> StatusOptions { get; } = new() { "All", "Selected", "Rejected", "On Hold", "Pending" };
    public List<string> PositionOptions { get; private set; } = new() { "All" };

    public event Action<string>? NavigateToDetail;
    public event Action<string>? NavigateToEdit;

    partial void OnSearchTextChanged(string value) => ApplyFilters();
    partial void OnSelectedStatusChanged(string value) => ApplyFilters();
    partial void OnSelectedPositionChanged(string value) => ApplyFilters();

    [RelayCommand]
    public async Task LoadCandidatesAsync()
    {
        IsLoading = true;
        HasError = false;
        ErrorMessage = "";

        var result = await App.ApiService.GetCandidatesAsync();

        if (result.Success && result.Data != null)
        {
            _allCandidates = result.Data;

            // Build position filter list
            var positions = _allCandidates
                .Select(c => c.PositionAppliedFor)
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .Distinct()
                .OrderBy(p => p)
                .ToList();
            PositionOptions = new List<string> { "All" }.Concat(positions).ToList();
            OnPropertyChanged(nameof(PositionOptions));

            ApplyFilters();
            LastRefreshed = $"Last refreshed: {DateTime.Now:hh:mm tt}";
        }
        else
        {
            HasError = true;
            ErrorMessage = result.Error ?? "Failed to load candidates.";
        }

        IsLoading = false;
    }

    private void ApplyFilters()
    {
        var filtered = _allCandidates.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(SearchText))
        {
            var search = SearchText.Trim().ToLowerInvariant();
            filtered = filtered.Where(c =>
                c.CandidateName.ToLowerInvariant().Contains(search) ||
                c.InterviewId.ToLowerInvariant().Contains(search) ||
                c.MobileNo.ToLowerInvariant().Contains(search) ||
                c.PositionAppliedFor.ToLowerInvariant().Contains(search) ||
                c.Department.ToLowerInvariant().Contains(search));
        }

        if (SelectedStatus != "All" && !string.IsNullOrEmpty(SelectedStatus))
        {
            filtered = filtered.Where(c =>
                c.FinalStatus.Equals(SelectedStatus, StringComparison.OrdinalIgnoreCase));
        }

        if (SelectedPosition != "All" && !string.IsNullOrEmpty(SelectedPosition))
        {
            filtered = filtered.Where(c =>
                c.PositionAppliedFor.Equals(SelectedPosition, StringComparison.OrdinalIgnoreCase));
        }

        var list = filtered.ToList();
        FilteredCandidates = new ObservableCollection<Candidate>(list);
        RecordCount = list.Count;
    }

    [RelayCommand]
    public void ClearFilters()
    {
        SearchText = "";
        SelectedStatus = "All";
        SelectedPosition = "All";
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

    [RelayCommand]
    public async Task OpenResumeLinkAsync(string url)
    {
        if (string.IsNullOrWhiteSpace(url)) return;
        await Windows.System.Launcher.LaunchUriAsync(new Uri(url));
    }
}

