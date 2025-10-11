using GeoLog.Api.Data.Entities;
using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace GeoLog.Api.DTOs
{
    public class RouteUploadDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public RouteVisibility Visibility { get; set; } = RouteVisibility.Private;
        [Required]
        public IFormFile GpxFile { get; set;}
    }
}
