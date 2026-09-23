using InterviewTracker.ViewModels;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;

namespace InterviewTracker.Views;

public sealed partial class CandidateDetailPage : Page
{
    public CandidateDetailViewModel ViewModel { get; } = new();

    public CandidateDetailPage()
    {
        this.InitializeComponent();

        ViewModel.NavigateToEdit += id => MainWindow.GetCurrent()?.NavigateTo("editcandidate", id);
        ViewModel.GoBack += () => Frame.GoBack();
    }

    protected override async void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        if (e.Parameter is string interviewId)
            await ViewModel.LoadCandidateCommand.ExecuteAsync(interviewId);
    }

    private void BackButton_Click(object sender, RoutedEventArgs e)
        => ViewModel.BackCommand.Execute(null);

    private void EditButton_Click(object sender, RoutedEventArgs e)
        => ViewModel.EditCandidateCommand.Execute(null);

    private async void WhatsAppButton_Click(object sender, RoutedEventArgs e)
        => await ViewModel.OpenWhatsAppCommand.ExecuteAsync(null);

    private async void ResumeButton_Click(object sender, RoutedEventArgs e)
        => await ViewModel.OpenResumeCommand.ExecuteAsync(null);
}

