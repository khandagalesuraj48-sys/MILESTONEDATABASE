using System.Text.Json.Serialization;

namespace InterviewTracker.Models;

public class Candidate
{
    [JsonPropertyName("Interview ID")]
    public string InterviewId { get; set; } = "";

    [JsonPropertyName("Interview Date")]
    public string InterviewDate { get; set; } = "";

    [JsonPropertyName("Candidate Name")]
    public string CandidateName { get; set; } = "";

    [JsonPropertyName("Mobile No.")]
    public string MobileNo { get; set; } = "";

    [JsonPropertyName("Position Applied For")]
    public string PositionAppliedFor { get; set; } = "";

    [JsonPropertyName("Department")]
    public string Department { get; set; } = "";

    [JsonPropertyName("Education / Qualification")]
    public string EducationQualification { get; set; } = "";

    [JsonPropertyName("Total Experience (Years)")]
    public string TotalExperienceYears { get; set; } = "";

    [JsonPropertyName("Current Location")]
    public string CurrentLocation { get; set; } = "";

    [JsonPropertyName("Current Salary")]
    public string CurrentSalary { get; set; } = "";

    [JsonPropertyName("Expected Salary")]
    public string ExpectedSalary { get; set; } = "";

    [JsonPropertyName("Notice Period")]
    public string NoticePeriod { get; set; } = "";

    [JsonPropertyName("Joining Availability")]
    public string JoiningAvailability { get; set; } = "";

    [JsonPropertyName("Technical Knowledge (10)")]
    public string TechnicalKnowledge { get; set; } = "";

    [JsonPropertyName("Recommendation")]
    public string Recommendation { get; set; } = "";

    [JsonPropertyName("Final Status")]
    public string FinalStatus { get; set; } = "";

    [JsonPropertyName("Joining Date")]
    public string JoiningDate { get; set; } = "";

    [JsonPropertyName("Interviewer")]
    public string Interviewer { get; set; } = "";

    [JsonPropertyName("Resume URL")]
    public string ResumeUrl { get; set; } = "";

    [JsonPropertyName("Remarks")]
    public string Remarks { get; set; } = "";
}

