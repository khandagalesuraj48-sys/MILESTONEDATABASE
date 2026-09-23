using InterviewTracker.Services;
using InterviewTracker.Views;
using Microsoft.UI.Xaml;

namespace InterviewTracker;

public partial class App : Application
{
    public static ApiService ApiService { get; private set; } = null!;
    public static SettingsService SettingsService { get; private set; } = null!;

    private Window? _window;

    public App()
    {
        this.InitializeComponent();
    }

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        SettingsService = new SettingsService();
        ApiService = new ApiService(SettingsService);

        _window = new MainWindow();
        _window.Activate();
    }

    public static Window? MainAppWindow { get; private set; }

    public static void SetMainWindow(Window window)
    {
        MainAppWindow = window;
    }
}

