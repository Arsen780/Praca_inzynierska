using GeoLog.Api.Data.Entities;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class GeoRoute
{
    [Key]
    public Guid Id { get; set; }

    [ForeignKey(nameof(User))]
    public Guid UserId { get; set; }
    public User User { get; set; }

    public string Name { get; set; } = string.Empty;
    public string Description { get; set; }

    // Jawna konwersja enum
    public RouteVisibility Visibility { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<RoutePoint> RoutePoints { get; set; } = new List<RoutePoint>();
    public RouteStat RouteStat { get; set; } = new RouteStat();
}