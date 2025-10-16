using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLog.Api.Data.Entities
{
    [Table("route_stats")]
    public class RouteStat
    {
        [Key]
        public Guid RouteId { get; set; }

        [ForeignKey(nameof(RouteId))]
        public GeoRoute Route { get; set; }

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
}