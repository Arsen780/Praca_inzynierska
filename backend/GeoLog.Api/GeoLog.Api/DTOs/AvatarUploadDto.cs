using Microsoft.AspNetCore.Authorization;
using System.ComponentModel.DataAnnotations;

namespace GeoLog.Api.DTOs
{
    public class AvatarUploadDto
    {
        [Required]
        public IFormFile AvatarFile { get; set; }
    }
}
