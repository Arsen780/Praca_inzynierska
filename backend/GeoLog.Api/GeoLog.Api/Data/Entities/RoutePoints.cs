using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using NetTopologySuite.Geometries;

namespace GeoLog.Api.Data.Entities
{
    [Table("route_points")]
    public class RoutePoint
    {
        [Key]
        public long Id { get; set; }
        // Relacja do GeoRoute
        [ForeignKey(nameof(GeoRoute))]
        public Guid RouteId { get; set; }
        public GeoRoute GeoRoute { get; set; }

        [Column(TypeName = "geography(PointZ, 4326)")]
        public Point Location { get; set; }
        
        public DateTime Timestamp { get; set; }
        
        public int Sequence { get; set; }

    }
}