using GeoLog.Api.Data.Entities;
using NetTopologySuite.IO;
using System.ComponentModel.DataAnnotations;

namespace GeoLog.Api.DTOs
{
    public class PointDto
    {
        [Required]
        public double Latitude { get; set; }
        [Required]
        public double Longitude { get; set; }
    }

    public class RouteCreateDto
    {
        [Required]
        [MaxLength(150)]
        public string Name { get; set; }
        public string? Description { get;set; }
        public RouteVisibility Visibility { get; set; } = RouteVisibility.Private;

        [Required]
        [MinLength(2, ErrorMessage = "Trasa musi się składać z conajmniej 2 punktów!")]
        public List<PointDto> Points { get; set; } = new List<PointDto>();

    }
}
