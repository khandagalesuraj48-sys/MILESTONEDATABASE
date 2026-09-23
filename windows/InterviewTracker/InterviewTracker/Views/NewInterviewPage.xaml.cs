using InterviewTracker.ViewModels;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;
using WinRT.Interop;

namespace InterviewTracker.Views;

public sealed partial class NewInterviewPage : Page
{
    public NewInterviewViewModel ViewModel { get; } = new();

    public NewInterviewPage()
    {
        this.InitializeComponent();

        ViewModel.GetWindowHandle = () =>
        {
            var window = MainWindow.GetCurrent();
            return window != null ? WindowNative.GetWindowHandle(window) : nint.Zero;
        };
    }

    protected override async void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        await ViewModel.LoadDropdownsAsync();
    }

    private async void PickPdfButton_Click(object sender, RoutedEventArgs e)
    {
        PickPdfButton.IsEnabled = false;
        await ViewModel.PickPdfFileAsync();
        PickPdfButton.IsEnabled = true;
    }

    private async void SubmitButton_Click(object sender, RoutedEventArgs e)
    {
        // Sync ComboBox selections to ViewModel before submitting
        ViewModel.PositionAppliedFor = PositionCombo.Text ?? PositionCombo.SelectedItem as string ?? "";
        ViewModel.Department = DepartmentCombo.Text ?? DepartmentCombo.SelectedItem as string ?? "";
        ViewModel.JoiningAvailability = JoiningAvailCombo.SelectedItem as string ?? "";
        ViewModel.Recommendation = RecommendCombo.SelectedItem as string ?? "";
        ViewModel.FinalStatus = FinalStatusCombo.SelectedItem as string ?? "";

        if (!ViewModel.CanSubmit)
        {
            await ShowErrorDialogAsync("Please select and process a PDF resume before submitting.");
            return;
        }

        SubmitButton.IsEnabled = false;
        await ViewModel.SubmitAsync();
        SubmitButton.IsEnabled = true;
    }

    private async Task ShowErrorDialogAsync(string message)
    {
        var dialog = new ContentDialog
        {
            Title = "Validation Error",
            Content = message,
            CloseButtonText = "OK",
            XamlRoot = this.XamlRoot
        };
        await dialog.ShowAsync();
    }
}

