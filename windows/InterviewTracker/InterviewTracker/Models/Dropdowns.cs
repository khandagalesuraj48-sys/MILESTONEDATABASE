using System.Text.Json.Serialization;

namespace InterviewTracker.Models;

public class Dropdowns
{
    [JsonPropertyName("joiningAvailability")]
    public List<string> JoiningAvailability { get; set; } = new();

    [JsonPropertyName("recommendation")]
    public List<string> Recommendation { get; set; } = new();

    [JsonPropertyName("finalStatus")]
    public List<string> FinalStatus { get; set; } = new();

    [JsonPropertyName("department")]
    public List<string> Department { get; set; } = new();

    [JsonPropertyName("position")]
    public List<string> Position { get; set; } = new();
}

