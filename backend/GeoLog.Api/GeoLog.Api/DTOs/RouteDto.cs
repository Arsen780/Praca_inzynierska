using GeoLog.Api.Data.Entities;

namespace GeoLog.Api.DTOs
{
    public class RouteDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public RouteVisibility Visibility { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public RouteStatDto Stats { get; set; }
    }

    public class RouteStatDto
    {
        public decimal TotalDistanceMeters { get; set; }
        public int DurationSeconds { get; set; }
        public decimal AvgSpeedKmh { get; set; }
        public decimal MaxSpeedKmh { get; set; }
        public decimal ElevationGainMeters { get; set; }
        public decimal ElevationLossMeters { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public DateTime LastRecalculatedAt { get; set; }
    }

    public class RoutePointDto
    {
        public long Id { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public double? Elevation { get; set; }
        public DateTime Timestamp { get; set; }
        public int Sequence { get; set; }
    }

}