using InterviewTracker.Views;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;

namespace InterviewTracker.Views;

public sealed partial class MainWindow : Window
{
    public MainWindow()
    {
        this.InitializeComponent();
        App.SetMainWindow(this);
        DateTextBlock.Text = DateTime.Now.ToString("dddd, MMMM d, yyyy");
        this.ExtendsContentIntoTitleBar = true;
    }

    public void NavigateTo(string tag, object? parameter = null)
    {
        Type? pageType = tag.ToLowerInvariant() switch
        {
            "dashboard" => typeof(DashboardPage),
            "newinterview" => typeof(NewInterviewPage),
            "candidates" => typeof(CandidatesPage),
            "candidatedetail" => typeof(CandidateDetailPage),
            "editcandidate" => typeof(EditCandidatePage),
            "settings" => typeof(SettingsPage),
            _ => null
        };

        if (pageType == null) return;

        // Update nav selection for top-level pages
        NavigationViewItem? selected = tag.ToLowerInvariant() switch
        {
            "dashboard" => DashboardItem,
            "newinterview" => NewInterviewItem,
            "candidates" => CandidatesItem,
            "settings" => NavView.SettingsItem as NavigationViewItem,
            _ => null
        };
        if (selected != null) NavView.SelectedItem = selected;

        ContentFrame.Navigate(pageType, parameter);
    }

    private void NavView_Loaded(object sender, RoutedEventArgs e)
    {
        NavView.SelectedItem = DashboardItem;
        ContentFrame.Navigate(typeof(DashboardPage));
    }

    private void NavView_SelectionChanged(NavigationView sender, NavigationViewSelectionChangedEventArgs args)
    {
        if (args.IsSettingsSelected)
        {
            ContentFrame.Navigate(typeof(SettingsPage));
            return;
        }

        if (args.SelectedItem is NavigationViewItem item)
        {
            var tag = item.Tag as string;
            if (tag == null) return;

            Type? pageType = tag switch
            {
                "dashboard" => typeof(DashboardPage),
                "newinterview" => typeof(NewInterviewPage),
                "candidates" => typeof(CandidatesPage),
                _ => null
            };

            if (pageType != null && ContentFrame.CurrentSourcePageType != pageType)
                ContentFrame.Navigate(pageType);
        }
    }

    public static MainWindow? GetCurrent()
        => App.MainAppWindow as MainWindow;
}

