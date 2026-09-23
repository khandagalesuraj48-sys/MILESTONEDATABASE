using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using InterviewTracker.Models;
using InterviewTracker.Helpers;
using Windows.Storage;

namespace InterviewTracker.ViewModels;

public partial class EditCandidateViewModel : ObservableObject
{
    // ── Load state ────────────────────────────────────────────────────────
    [ObservableProperty] private bool _isLoading;
    [ObservableProperty] private bool _isSaving;
    [ObservableProperty] private string _errorMessage = "";
    [ObservableProperty] private bool _hasError;
    [ObservableProperty] private string _successMessage = "";
    [ObservableProperty] private bool _hasSuccess;

    // ── Fields ────────────────────────────────────────────────────────────
    [ObservableProperty] private string _interviewId = "";
    [ObservableProperty] private string _interviewDate = "";
    [ObservableProperty] private string _candidateName = "";
    [ObservableProperty] private string _mobileNo = "";
    [ObservableProperty] private string _positionAppliedFor = "";
    [ObservableProperty] private string _department = "";
    [ObservableProperty] private string _educationQualification = "";
    [ObservableProperty] private string _totalExperienceYears = "";
    [ObservableProperty] private string _currentLocation = "";
    [ObservableProperty] private string _currentSalary = "";
    [ObservableProperty] private string _expectedSalary = "";
    [ObservableProperty] private string _noticePeriod = "";
    [ObservableProperty] private string _joiningAvailability = "";
    [ObservableProperty] private string _technicalKnowledge = "";
    [ObservableProperty] private string _recommendation = "";
    [ObservableProperty] private string _finalStatus = "";
    [ObservableProperty] private string _joiningDate = "";
    [ObservableProperty] private string _interviewer = "";
    [ObservableProperty] private string _remarks = "";
    [ObservableProperty] private string _existingResumeUrl = "";

    // ── Resume replacement ────────────────────────────────────────────────
    [ObservableProperty] private bool _replaceResume;
    [ObservableProperty] private string _newFileName = "";
    [ObservableProperty] private string _newFileSize = "";
    [ObservableProperty] private bool _hasNewFile;

    // ── Dropdowns ─────────────────────────────────────────────────────────
    [ObservableProperty] private List<string> _joiningAvailabilityOptions = new();
    [ObservableProperty] private List<string> _recommendationOptions = new();
    [ObservableProperty] private List<string> _finalStatusOptions = new();
    [ObservableProperty] private List<string> _departmentOptions = new();
    [ObservableProperty] private List<string> _positionOptions = new();

    private ResumeFile? _newResumeFile;
    private StorageFile? _pickedFile;

    public Func<nint>? GetWindowHandle { get; set; }
    public event Action? GoBack;

    public async Task LoadCandidateAsync(string interviewId)
    {
        IsLoading = true;
        HasError = false;

        // Load dropdowns and candidate in parallel
        var dropdownsTask = App.ApiService.GetDropdownsAsync();
        var candidateTask = App.ApiService.GetCandidateAsync(interviewId);

        await Task.WhenAll(dropdownsTask, candidateTask);

        var dropdownResult = await dropdownsTask;
        if (dropdownResult.Success && dropdownResult.Data != null)
        {
            JoiningAvailabilityOptions = dropdownResult.Data.JoiningAvailability;
            RecommendationOptions = dropdownResult.Data.Recommendation;
            FinalStatusOptions = dropdownResult.Data.FinalStatus;
            DepartmentOptions = dropdownResult.Data.Department;
            PositionOptions = dropdownResult.Data.Position;
        }

        var candidateResult = await candidateTask;
        if (candidateResult.Success && candidateResult.Data != null)
        {
            PopulateFromCandidate(candidateResult.Data);
        }
        else
        {
            HasError = true;
            ErrorMessage = candidateResult.Error ?? "Failed to load candidate.";
        }

        IsLoading = false;
    }

    private void PopulateFromCandidate(Candidate c)
    {
        InterviewId = c.InterviewId;
        InterviewDate = c.InterviewDate;
        CandidateName = c.CandidateName;
        MobileNo = c.MobileNo;
        PositionAppliedFor = c.PositionAppliedFor;
        Department = c.Department;
        EducationQualification = c.EducationQualification;
        TotalExperienceYears = c.TotalExperienceYears;
        CurrentLocation = c.CurrentLocation;
        CurrentSalary = c.CurrentSalary;
        ExpectedSalary = c.ExpectedSalary;
        NoticePeriod = c.NoticePeriod;
        JoiningAvailability = c.JoiningAvailability;
        TechnicalKnowledge = c.TechnicalKnowledge;
        Recommendation = c.Recommendation;
        FinalStatus = c.FinalStatus;
        JoiningDate = c.JoiningDate;
        Interviewer = c.Interviewer;
        Remarks = c.Remarks;
        ExistingResumeUrl = c.ResumeUrl;
    }

    [RelayCommand]
    public async Task PickNewPdfAsync()
    {
        var handle = GetWindowHandle?.Invoke() ?? nint.Zero;
        var (file, error) = await FileHelper.PickPdfFileAsync(handle);

        if (error != null)
        {
            HasError = true;
            ErrorMessage = error;
            return;
        }

        if (file == null) return;

        _pickedFile = file;
        var props = await file.GetBasicPropertiesAsync();
        NewFileName = file.Name;
        NewFileSize = FileHelper.FormatFileSize(props.Size);
        HasNewFile = true;
        _newResumeFile = await FileHelper.ReadFileAsResumeFileAsync(file);
    }

    [RelayCommand]
    public async Task SaveChangesAsync()
    {
        var validationError = ValidationHelper.ValidateNewInterviewForm(
            CandidateName, MobileNo, PositionAppliedFor, Department);

        if (validationError != null)
        {
            HasError = true;
            ErrorMessage = validationError;
            return;
        }

        IsSaving = true;
        HasError = false;
        HasSuccess = false;

        var request = new UpdateCandidateRequest
        {
            InterviewId = InterviewId,
            Candidate = BuildCandidateDictionary(),
            ReplaceResume = ReplaceResume && HasNewFile,
            File = (ReplaceResume && HasNewFile) ? _newResumeFile : null
        };

        var result = await App.ApiService.UpdateCandidateAsync(request);

        if (result.Success && result.Data != null)
        {
            HasSuccess = true;
            SuccessMessage = $"✓ Candidate #{result.Data.InterviewId} updated successfully.";
            if (!string.IsNullOrWhiteSpace(result.Data.ResumeUrl))
                ExistingResumeUrl = result.Data.ResumeUrl;
        }
        else
        {
            HasError = true;
            ErrorMessage = result.Error ?? "Failed to update candidate.";
        }

        IsSaving = false;
    }

    [RelayCommand]
    public void Cancel() => GoBack?.Invoke();

    private Dictionary<string, string> BuildCandidateDictionary() => new()
    {
        ["Interview Date"] = InterviewDate,
        ["Candidate Name"] = CandidateName,
        ["Mobile No."] = MobileNo,
        ["Position Applied For"] = PositionAppliedFor,
        ["Department"] = Department,
        ["Education / Qualification"] = EducationQualification,
        ["Total Experience (Years)"] = TotalExperienceYears,
        ["Current Location"] = CurrentLocation,
        ["Current Salary"] = CurrentSalary,
        ["Expected Salary"] = ExpectedSalary,
        ["Notice Period"] = NoticePeriod,
        ["Joining Availability"] = JoiningAvailability,
        ["Technical Knowledge (10)"] = TechnicalKnowledge,
        ["Recommendation"] = Recommendation,
        ["Final Status"] = FinalStatus,
        ["Joining Date"] = JoiningDate,
        ["Interviewer"] = Interviewer,
        ["Remarks"] = Remarks
    };
}

