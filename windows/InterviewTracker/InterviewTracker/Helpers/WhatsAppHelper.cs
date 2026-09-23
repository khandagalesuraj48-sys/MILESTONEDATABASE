using Windows.System;

namespace InterviewTracker.Helpers;

public static class WhatsAppHelper
{
    private const string WhatsAppBaseUrl = "https://wa.me/";

    public static string BuildMessage(
        string interviewId,
        string candidateName,
        string position,
        string education,
        string experience,
        string currentSalary,
        string expectedSalary,
        string joiningAvailability,
        string resumeUrl)
    {
        return $"Candidate Interview Details\n\n" +
               $"Interview ID: {interviewId}\n" +
               $"Candidate Name: {candidateName}\n" +
               $"Position Applied For: {position}\n" +
               $"Education / Qualification: {education}\n" +
               $"Total Experience (Years): {experience}\n" +
               $"Current Salary: {currentSalary}\n" +
               $"Expected Salary: {expectedSalary}\n" +
               $"Joining Availability: {joiningAvailability}\n\n" +
               $"Resume: {resumeUrl}";
    }

    public static string BuildWhatsAppUrl(string phoneNumber, string message)
    {
        var encoded = Uri.EscapeDataString(message);
        return $"{WhatsAppBaseUrl}{phoneNumber}?text={encoded}";
    }

    public static async Task OpenWhatsAppAsync(string phoneNumber, string message)
    {
        var url = BuildWhatsAppUrl(phoneNumber, message);
        await Launcher.LaunchUriAsync(new Uri(url));
    }

    public static async Task OpenWhatsAppForCandidateAsync(Models.Candidate candidate)
    {
        var message = BuildMessage(
            candidate.InterviewId,
            candidate.CandidateName,
            candidate.PositionAppliedFor,
            candidate.EducationQualification,
            candidate.TotalExperienceYears,
            candidate.CurrentSalary,
            candidate.ExpectedSalary,
            candidate.JoiningAvailability,
            candidate.ResumeUrl);

        var whatsappNumber = App.SettingsService.WhatsAppNumber;
        await OpenWhatsAppAsync(whatsappNumber, message);
    }
}

