using GeoLog.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace GeoLog.Api.Data
{
    public class GeoLogDbContext : DbContext
    {
        public GeoLogDbContext(DbContextOptions<GeoLogDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<GeoRoute> Routes { get; set; }
        public DbSet<RouteStat> RouteStats { get; set; }
        public DbSet<RoutePoint> RoutePoints { get; set; }
    }
}