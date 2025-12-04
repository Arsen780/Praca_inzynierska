using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLog.Api.Data.Entities
{
    [Table("users")] // Mówi EF Core, że ta klasa odpowiada tabeli "users"
    public class User
    {
        [Key]
        public Guid Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string HashedPassword { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string? VerificationToken { get; set; }
        public DateTime? VerifiedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? AvatarUrl { get; set; }

        // Ten użytkownik jest autorem kolekcji tras.
        public ICollection<GeoRoute> Routes { get; set; } = new List<GeoRoute>();

    }
}