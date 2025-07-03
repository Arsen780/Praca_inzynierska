using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLog.Api.Data.Entities
{
    [Table("users")] // Mówi EF Core, że ta klasa odpowiada tabeli "users"
    public class User
    {
        [Key] // Mówi EF Core, że to jest klucz główny
        public Guid Id { get; set; }
        public string Email { get; set; }
        public string HashedPassword { get; set; }
        public string? Username { get; set; } // Znak zapytania oznacza, że pole może być null
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}