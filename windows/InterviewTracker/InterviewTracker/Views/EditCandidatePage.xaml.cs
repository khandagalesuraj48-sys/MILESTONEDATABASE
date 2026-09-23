using InterviewTracker.ViewModels;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;
using WinRT.Interop;

namespace InterviewTracker.Views;

public sealed partial class EditCandidatePage : Page
{
    public EditCandidateViewModel ViewModel { get; } = new();

    public EditCandidatePage()
    {
        this.InitializeComponent();

        ViewModel.GetWindowHandle = () =>
        {
            var window = MainWindow.GetCurrent();
            return window != null ? WindowNative.GetWindowHandle(window) : nint.Zero;
        };

        ViewModel.GoBack += () =>
        {
            var main = MainWindow.GetCurrent();
            main?.NavigateTo("candidates");
        };
    }

    protected override async void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        if (e.Parameter is string id && !string.IsNullOrWhiteSpace(id))
        {
            await ViewModel.LoadCandidateAsync(id);
        }
    }

    private void BackButton_Click(object sender, RoutedEventArgs e)
    {
        var main = MainWindow.GetCurrent();
        main?.NavigateTo("candidates");
    }

    private async void PickPdfButton_Click(object sender, RoutedEventArgs e)
    {
        await ViewModel.PickNewPdfAsync();
    }

    private async void SaveButton_Click(object sender, RoutedEventArgs e)
    {
        // Sync ComboBoxes
        ViewModel.JoiningAvailability = JoiningAvailCombo.SelectedItem as string ?? ViewModel.JoiningAvailability;
        ViewModel.Recommendation = RecommendCombo.SelectedItem as string ?? ViewModel.Recommendation;
        ViewModel.FinalStatus = FinalStatusCombo.SelectedItem as string ?? ViewModel.FinalStatus;

        await ViewModel.SaveChangesAsync();
    }
}

