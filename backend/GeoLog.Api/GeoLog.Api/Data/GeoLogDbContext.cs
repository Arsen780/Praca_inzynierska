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
        // W przyszłości dodasz tutaj inne tabele, np.
        // public DbSet<Route> Routes { get; set; }
    }
}