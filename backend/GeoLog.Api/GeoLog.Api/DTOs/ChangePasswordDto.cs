using System.ComponentModel.DataAnnotations;

namespace GeoLog.Api.DTOs
{
    public class ChangePasswordDto
    {
        [Required]
        public string CurrentPassword { get; set; }
        [Required]
        [MinLength(8)]
        public string NewPassword { get; set; }
    }
}
