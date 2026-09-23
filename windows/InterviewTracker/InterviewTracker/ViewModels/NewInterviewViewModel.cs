using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using InterviewTracker.Models;
using InterviewTracker.Helpers;
using Windows.Storage;

namespace InterviewTracker.ViewModels;

public partial class NewInterviewViewModel : ObservableObject
{
    // ── File state ────────────────────────────────────────────────────────
    [ObservableProperty] private string _selectedFileName = "";
    [ObservableProperty] private string _selectedFileSize = "";
    [ObservableProperty] private bool _hasFile;

    // ── AI processing state ───────────────────────────────────────────────
    [ObservableProperty] private bool _isProcessingAi;
    [ObservableProperty] private string _aiStageMessage = "";
    [ObservableProperty] private bool _aiProcessingComplete;
    [ObservableProperty] private bool _aiError;
    [ObservableProperty] private string _aiErrorMessage = "";

    // ── Form submit state ─────────────────────────────────────────────────
    [ObservableProperty] private bool _isSubmitting;
    [ObservableProperty] private string _submitErrorMessage = "";
    [ObservableProperty] private bool _hasSubmitError;
    [ObservableProperty] private string _successMessage = "";
    [ObservableProperty] private bool _hasSuccess;

    // ── AI-extracted fields (purple border) ───────────────────────────────
    [ObservableProperty] private string _candidateName = "";
    [ObservableProperty] private string _mobileNo = "";
    [ObservableProperty] private string _educationQualification = "";
    [ObservableProperty] private string _totalExperienceYears = "";

    // ── Manual fields (green border) ──────────────────────────────────────
    [ObservableProperty] private string _interviewDate = DateTime.Today.ToString("yyyy-MM-dd");
    [ObservableProperty] private string _positionAppliedFor = "";
    [ObservableProperty] private string _department = "";
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

    // ── Dropdown options ──────────────────────────────────────────────────
    [ObservableProperty] private List<string> _joiningAvailabilityOptions = new();
    [ObservableProperty] private List<string> _recommendationOptions = new();
    [ObservableProperty] private List<string> _finalStatusOptions = new();
    [ObservableProperty] private List<string> _departmentOptions = new();
    [ObservableProperty] private List<string> _positionOptions = new();

    private ResumeFile? _resumeFile;
    private StorageFile? _pickedFile;

    public Func<nint>? GetWindowHandle { get; set; }
    public event Action? NavigateBack;

    public bool CanSubmit => AiProcessingComplete && HasFile && !IsSubmitting;

    public async Task LoadDropdownsAsync()
    {
        var result = await App.ApiService.GetDropdownsAsync();
        if (result.Success && result.Data != null)
        {
            JoiningAvailabilityOptions = result.Data.JoiningAvailability;
            RecommendationOptions = result.Data.Recommendation;
            FinalStatusOptions = result.Data.FinalStatus;
            DepartmentOptions = result.Data.Department;
            PositionOptions = result.Data.Position;
        }
    }

    [RelayCommand]
    public async Task PickPdfFileAsync()
    {
        var handle = GetWindowHandle?.Invoke() ?? nint.Zero;
        var (file, error) = await FileHelper.PickPdfFileAsync(handle);

        if (error != null)
        {
            AiError = true;
            AiErrorMessage = error;
            return;
        }

        if (file == null) return;

        _pickedFile = file;
        var props = await file.GetBasicPropertiesAsync();
        SelectedFileName = file.Name;
        SelectedFileSize = FileHelper.FormatFileSize(props.Size);
        HasFile = true;
        AiProcessingComplete = false;
        AiError = false;
        AiErrorMessage = "";
        CandidateName = "";
        MobileNo = "";
        EducationQualification = "";
        TotalExperienceYears = "";

        await ProcessResumeWithAiAsync();
    }

    private async Task ProcessResumeWithAiAsync()
    {
        IsProcessingAi = true;
        AiError = false;

        AiStageMessage = "Stage 1: Reading PDF...";
        await Task.Delay(300);

        _resumeFile = await FileHelper.ReadFileAsResumeFileAsync(_pickedFile!);

        AiStageMessage = "Stage 2: Sending to AI...";
        await Task.Delay(200);

        AiStageMessage = "Stage 3: Extracting candidate details...";
        var request = new ProcessResumeRequest { File = _resumeFile };
        var result = await App.ApiService.ProcessResumeAsync(request);

        if (!result.Success || result.Data?.Candidate == null)
        {
            AiError = true;
            AiErrorMessage = result.Error ?? "AI processing failed. Please fill in the fields manually.";
            IsProcessingAi = false;
            AiProcessingComplete = true; // allow form submission even on AI failure
            AiStageMessage = "AI extraction failed — please fill fields manually.";
            OnPropertyChanged(nameof(CanSubmit));
            return;
        }

        AiStageMessage = "Stage 4: Preparing form...";
        await Task.Delay(200);

        var extracted = result.Data.Candidate;
        CandidateName = extracted.CandidateName;
        MobileNo = extracted.MobileNo;
        EducationQualification = extracted.EducationQualification;
        TotalExperienceYears = extracted.TotalExperienceYears;

        IsProcessingAi = false;
        AiProcessingComplete = true;
        AiStageMessage = "✓ AI extraction complete";
        OnPropertyChanged(nameof(CanSubmit));
    }

    [RelayCommand(CanExecute = nameof(CanSubmit))]
    public async Task SubmitAsync()
    {
        var validationError = ValidationHelper.ValidateNewInterviewForm(
            CandidateName, MobileNo, PositionAppliedFor, Department);

        if (validationError != null)
        {
            HasSubmitError = true;
            SubmitErrorMessage = validationError;
            return;
        }

        IsSubmitting = true;
        HasSubmitError = false;
        HasSuccess = false;

        var candidate = BuildCandidateDictionary();
        var request = new SaveCandidateRequest
        {
            File = _resumeFile!,
            Candidate = candidate,
            Remarks = Remarks
        };

        var result = await App.ApiService.SaveCandidateAsync(request);

        if (result.Success && result.Data != null)
        {
            HasSuccess = true;
            SuccessMessage = $"✓ Interview saved! ID: {result.Data.InterviewId}";
            ClearForm();
        }
        else
        {
            HasSubmitError = true;
            SubmitErrorMessage = result.Error ?? "Failed to save interview record.";
        }

        IsSubmitting = false;
    }

    [RelayCommand]
    public void ClearForm()
    {
        CandidateName = "";
        MobileNo = "";
        EducationQualification = "";
        TotalExperienceYears = "";
        InterviewDate = DateTime.Today.ToString("yyyy-MM-dd");
        PositionAppliedFor = "";
        Department = "";
        CurrentLocation = "";
        CurrentSalary = "";
        ExpectedSalary = "";
        NoticePeriod = "";
        JoiningAvailability = "";
        TechnicalKnowledge = "";
        Recommendation = "";
        FinalStatus = "";
        JoiningDate = "";
        Interviewer = "";
        Remarks = "";
        SelectedFileName = "";
        SelectedFileSize = "";
        HasFile = false;
        AiProcessingComplete = false;
        AiStageMessage = "";
        AiError = false;
        HasSubmitError = false;
        HasSuccess = false;
        _resumeFile = null;
        _pickedFile = null;
        OnPropertyChanged(nameof(CanSubmit));
    }

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

