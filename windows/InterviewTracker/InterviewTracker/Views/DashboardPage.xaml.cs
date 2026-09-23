using InterviewTracker.ViewModels;
using InterviewTracker.Models;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;

namespace InterviewTracker.Views;

public sealed partial class DashboardPage : Page
{
    public DashboardViewModel ViewModel { get; } = new();

    public DashboardPage()
    {
        this.InitializeComponent();

        ViewModel.NavigateToDetail += id => MainWindow.GetCurrent()?.NavigateTo("candidatedetail", id);
        ViewModel.NavigateToEdit += id => MainWindow.GetCurrent()?.NavigateTo("editcandidate", id);
    }

    protected override async void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        await ViewModel.LoadDashboardAsync();
    }

    private void ViewButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is string id)
            ViewModel.ViewCandidateCommand.Execute(id);
    }

    private void EditButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is string id)
            ViewModel.EditCandidateCommand.Execute(id);
    }

    private async void WhatsAppButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is string id)
        {
            // Find the candidate in the list
            var candidate = ViewModel.RecentCandidates.FirstOrDefault(c => c.InterviewId == id);
            if (candidate != null)
                await ViewModel.OpenWhatsAppForCandidateCommand.ExecuteAsync(candidate);
        }
    }
}

