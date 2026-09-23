using System.Text.Json.Serialization;

namespace InterviewTracker.Models;

public class ResumeFile
{
    [JsonPropertyName("fileName")]
    public string FileName { get; set; } = "";

    [JsonPropertyName("mimeType")]
    public string MimeType { get; set; } = "application/pdf";

    [JsonPropertyName("base64")]
    public string Base64 { get; set; } = "";
}

public class ProcessResumeRequest
{
    [JsonPropertyName("action")]
    public string Action { get; set; } = "processResume";

    [JsonPropertyName("file")]
    public ResumeFile File { get; set; } = new();
}

public class SaveCandidateRequest
{
    [JsonPropertyName("action")]
    public string Action { get; set; } = "saveCandidate";

    [JsonPropertyName("file")]
    public ResumeFile File { get; set; } = new();

    [JsonPropertyName("candidate")]
    public Dictionary<string, string> Candidate { get; set; } = new();

    [JsonPropertyName("remarks")]
    public string Remarks { get; set; } = "";
}

public class UpdateCandidateRequest
{
    [JsonPropertyName("action")]
    public string Action { get; set; } = "updateCandidate";

    [JsonPropertyName("interviewId")]
    public string InterviewId { get; set; } = "";

    [JsonPropertyName("candidate")]
    public Dictionary<string, string> Candidate { get; set; } = new();

    [JsonPropertyName("replaceResume")]
    public bool ReplaceResume { get; set; }

    [JsonPropertyName("file")]
    public ResumeFile? File { get; set; }
}

