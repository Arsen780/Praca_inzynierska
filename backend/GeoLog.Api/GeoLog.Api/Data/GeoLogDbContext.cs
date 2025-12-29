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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<GeoRoute>()
            .Property(e => e.Visibility)
            .HasConversion<string>();

            modelBuilder.Entity<GeoRoute>()
                .HasOne(r => r.User)
                .WithMany(u => u.Routes)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<RouteStat>()
            .HasKey(rs => rs.RouteId);

            modelBuilder.Entity<RouteStat>()
                .HasOne(rs => rs.Route)
                .WithOne(r => r.RouteStat)
                .HasForeignKey<RouteStat>(rs => rs.RouteId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<RoutePoint>()
                .HasOne(rp => rp.GeoRoute)
                .WithMany(r => r.RoutePoints)
                .HasForeignKey(rp => rp.RouteId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}