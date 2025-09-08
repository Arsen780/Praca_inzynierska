using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLog.Api.Data.Entities
{
    [Table("routes")]
    public class GeoRoute
    {
        [Key]
        public Guid Id { get; set; }
        // Relacja do User
        [ForeignKey(nameof(User))]
        public Guid UserId { get; set; }
        public User User { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; }
        public RouteVisibility Visibility { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        // WŁAŚCIWOŚCI NAWIGACYJNE:
        // Ta trasa składa się z kolekcji punktów.
        public ICollection<RoutePoint> RoutePoints { get; set; } = new List<RoutePoint>();

        // Ta trasa ma dokładnie jedne statystyki.
        public RouteStat RouteStat { get; set; }

    }
}