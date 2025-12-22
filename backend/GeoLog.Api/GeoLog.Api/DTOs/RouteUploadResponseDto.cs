namespace GeoLog.Api.DTOs
{
    public class RouteUploadResponseDto
    {
        public RouteDto Route { get; set; }
        public List<string> SanitizationLogs { get; set; } = new List<string>();
    }
}