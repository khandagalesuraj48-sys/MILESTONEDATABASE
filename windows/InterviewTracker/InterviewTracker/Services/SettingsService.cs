using Microsoft.Extensions.Configuration;

namespace InterviewTracker.Services;

public class AppSettings
{
    public string ApiBaseUrl { get; set; } = "";
    public string WhatsAppNumber { get; set; } = "918452845537";
    public int MaxFileSizeMb { get; set; } = 20;
}

public class SettingsService
{
    private readonly AppSettings _settings;

    public SettingsService()
    {
        var config = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: false, reloadOnChange: false)
            .Build();

        _settings = config.Get<AppSettings>() ?? new AppSettings();
    }

    public string ApiBaseUrl => _settings.ApiBaseUrl;
    public string WhatsAppNumber => _settings.WhatsAppNumber;
    public int MaxFileSizeMb => _settings.MaxFileSizeMb;
}

