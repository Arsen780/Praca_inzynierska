using System.ComponentModel.DataAnnotations;

namespace GeoLog.Api.DTOs
{
    public class RegisterUserDto
    {

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        [MinLength(8)]
        public string Password { get; set; }

        [Required(ErrorMessage = "Nazwa użytkownika jest wymagana.")] // <-- Poprawka: dodaliśmy walidację
        [MinLength(3, ErrorMessage = "Nazwa użytkownika musi mieć co najmniej 3 znaki.")]
        public string Username { get; set; }

    }
}
