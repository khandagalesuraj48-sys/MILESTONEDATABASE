using Windows.Storage;
using Windows.Storage.Pickers;
using InterviewTracker.Models;
using WinRT.Interop;

namespace InterviewTracker.Helpers;

public static class FileHelper
{
    public static async Task<(StorageFile? file, string? error)> PickPdfFileAsync(nint windowHandle)
    {
        var picker = new FileOpenPicker();
        picker.FileTypeFilter.Add(".pdf");
        picker.SuggestedStartLocation = PickerLocationId.DocumentsLibrary;
        picker.ViewMode = PickerViewMode.List;

        InitializeWithWindow.Initialize(picker, windowHandle);

        var file = await picker.PickSingleFileAsync();
        if (file == null) return (null, null);

        // Validate extension
        if (!file.Name.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            return (null, "Only PDF files are supported.");

        // Validate size (20 MB)
        var props = await file.GetBasicPropertiesAsync();
        long maxBytes = App.SettingsService.MaxFileSizeMb * 1024L * 1024L;
        if ((long)props.Size > maxBytes)
            return (null, $"File too large. Maximum size is {App.SettingsService.MaxFileSizeMb} MB.");

        return (file, null);
    }

    public static async Task<ResumeFile?> ReadFileAsResumeFileAsync(StorageFile file)
    {
        var buffer = await FileIO.ReadBufferAsync(file);
        var bytes = new byte[buffer.Length];
        using var reader = Windows.Storage.Streams.DataReader.FromBuffer(buffer);
        reader.ReadBytes(bytes);

        return new ResumeFile
        {
            FileName = file.Name,
            MimeType = "application/pdf",
            Base64 = Convert.ToBase64String(bytes)
        };
    }

    public static string FormatFileSize(ulong bytes)
    {
        if (bytes < 1024) return $"{bytes} B";
        if (bytes < 1024 * 1024) return $"{bytes / 1024.0:F1} KB";
        return $"{bytes / (1024.0 * 1024.0):F1} MB";
    }
}

