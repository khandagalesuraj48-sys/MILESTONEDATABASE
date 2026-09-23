using Microsoft.UI;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Media;

namespace InterviewTracker.Converters;

public class StatusToColorConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, string language)
    {
        var status = value as string ?? "";
        return status.ToLowerInvariant() switch
        {
            "selected" => Colors.Green,
            "rejected" => Colors.Red,
            "on hold" or "hold" => Colors.Orange,
            "pending" => Colors.Gray,
            _ => Colors.Gray
        };
    }

    public object ConvertBack(object value, Type targetType, object parameter, string language)
        => throw new NotImplementedException();
}

public class StatusToBrushConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, string language)
    {
        var status = value as string ?? "";
        return status.ToLowerInvariant() switch
        {
            "selected" => new SolidColorBrush(Windows.UI.Color.FromArgb(255, 16, 185, 129)),
            "rejected" => new SolidColorBrush(Windows.UI.Color.FromArgb(255, 239, 68, 68)),
            "on hold" or "hold" => new SolidColorBrush(Windows.UI.Color.FromArgb(255, 245, 158, 11)),
            "pending" => new SolidColorBrush(Windows.UI.Color.FromArgb(255, 107, 114, 128)),
            _ => new SolidColorBrush(Windows.UI.Color.FromArgb(255, 107, 114, 128))
        };
    }

    public object ConvertBack(object value, Type targetType, object parameter, string language)
        => throw new NotImplementedException();
}

