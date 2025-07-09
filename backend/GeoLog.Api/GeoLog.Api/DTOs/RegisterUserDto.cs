using System.ComponentModel.DataAnnotations;

namespace GeoLog.Api.DTOs
{
    public class RegisterUserDto
    {

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        [RegularExpression(
            @"^(?=.*[A-Z])(?=.*\d).{8,}$",
            ErrorMessage = "Hasło musi mieć co najmniej 8 znaków, w tym co najmniej jedną dużą literę i jedną cyfrę.")]
        public string Password { get; set; }

        [Required(ErrorMessage = "Nazwa użytkownika jest wymagana.")]
        [MinLength(6, ErrorMessage = "Nazwa użytkownika musi mieć co najmniej 6 znaków.")]
        [MaxLength(25, ErrorMessage = "Nazwa użytkownika jest zbyt długa.")]
        public string Username { get; set; }

    }
}
