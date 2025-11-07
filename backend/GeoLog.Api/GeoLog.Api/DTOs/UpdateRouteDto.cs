using System.ComponentModel.DataAnnotations;

namespace GeoLog.Api.DTOs
{
    public class UpdateRouteDto
    {
        [Required]
        [MaxLength(150)]
        public string Name { get; set; }
        public string? Description { get; set; }
    }
}
