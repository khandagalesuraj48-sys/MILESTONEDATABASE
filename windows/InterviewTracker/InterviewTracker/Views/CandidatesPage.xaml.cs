using InterviewTracker.Models;
using InterviewTracker.ViewModels;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;

namespace InterviewTracker.Views;

public sealed partial class CandidatesPage : Page
{
    public CandidatesViewModel ViewModel { get; } = new();

    public CandidatesPage()
    {
        this.InitializeComponent();

        ViewModel.NavigateToDetail += id => MainWindow.GetCurrent()?.NavigateTo("candidatedetail", id);
        ViewModel.NavigateToEdit += id => MainWindow.GetCurrent()?.NavigateTo("editcandidate", id);

        ViewModel.PropertyChanged += (s, e) =>
        {
            if (e.PropertyName == nameof(ViewModel.RecordCount))
                RecordCountText.Text = $"{ViewModel.RecordCount} record(s) found  •  {ViewModel.LastRefreshed}";
        };
    }

    protected override async void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        await ViewModel.LoadCandidatesAsync();
    }

    private void CandViewButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is string id)
            ViewModel.ViewCandidateCommand.Execute(id);
    }

    private void CandEditButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is string id)
            ViewModel.EditCandidateCommand.Execute(id);
    }

    private async void CandWhatsAppButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is string id)
        {
            var candidate = ViewModel.FilteredCandidates.FirstOrDefault(c => c.InterviewId == id);
            if (candidate != null)
                await ViewModel.OpenWhatsAppForCandidateCommand.ExecuteAsync(candidate);
        }
    }

    private async void ResumeLink_Click(object sender, RoutedEventArgs e)
    {
        if (sender is HyperlinkButton btn && btn.Tag is string url && !string.IsNullOrWhiteSpace(url))
            await ViewModel.OpenResumeLinkCommand.ExecuteAsync(url);
    }
}

