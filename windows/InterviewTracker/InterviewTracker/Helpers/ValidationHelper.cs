namespace InterviewTracker.Helpers;

public static class ValidationHelper
{
    public static bool IsValidMobileNumber(string mobile)
    {
        if (string.IsNullOrWhiteSpace(mobile)) return false;
        var digits = new string(mobile.Where(char.IsDigit).ToArray());
        return digits.Length >= 10;
    }

    public static bool IsValidName(string name)
        => !string.IsNullOrWhiteSpace(name) && name.Trim().Length >= 2;

    public static bool IsRequired(string value)
        => !string.IsNullOrWhiteSpace(value);

    public static string? ValidateNewInterviewForm(
        string candidateName,
        string mobileNo,
        string positionAppliedFor,
        string department)
    {
        if (!IsValidName(candidateName))
            return "Candidate Name is required.";
        if (!IsValidMobileNumber(mobileNo))
            return "A valid Mobile Number is required.";
        if (!IsRequired(positionAppliedFor))
            return "Position Applied For is required.";
        if (!IsRequired(department))
            return "Department is required.";
        return null;
    }
}

