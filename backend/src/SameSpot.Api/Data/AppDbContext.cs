using Microsoft.EntityFrameworkCore;
using SameSpot.Api.Models;

namespace SameSpot.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<SpotifyToken> SpotifyTokens => Set<SpotifyToken>();
    public DbSet<Follow> Follows => Set<Follow>();
    public DbSet<TopArtist> TopArtists => Set<TopArtist>();
    public DbSet<TopTrack> TopTracks => Set<TopTrack>();
    public DbSet<Review> Reviews => Set<Review>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>()
            .HasIndex(u => u.SpotifyId)
            .IsUnique();

        modelBuilder.Entity<SpotifyToken>()
            .HasKey(t => t.UserId);

        modelBuilder.Entity<SpotifyToken>()
            .HasOne(t => t.User)
            .WithOne(u => u.SpotifyToken)
            .HasForeignKey<SpotifyToken>(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Un follow es único por pareja (seguidor, seguido): clave compuesta
        modelBuilder.Entity<Follow>()
            .HasKey(f => new { f.FollowerId, f.FollowingId });

        modelBuilder.Entity<Follow>()
            .HasOne(f => f.Follower)
            .WithMany(u => u.Following)
            .HasForeignKey(f => f.FollowerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Follow>()
            .HasOne(f => f.Following)
            .WithMany(u => u.Followers)
            .HasForeignKey(f => f.FollowingId)
            .OnDelete(DeleteBehavior.Cascade);

        // Los tops se consultan siempre por usuario y ordenados por rank
        modelBuilder.Entity<TopArtist>()
            .HasIndex(a => new { a.UserId, a.Rank });

        modelBuilder.Entity<TopTrack>()
            .HasIndex(t => new { t.UserId, t.Rank });

        // Una reseña por usuario y elemento: si quieres cambiarla, la editas
        modelBuilder.Entity<Review>()
            .HasIndex(r => new { r.UserId, r.ItemType, r.SpotifyItemId })
            .IsUnique();

        modelBuilder.Entity<Review>()
            .HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Review>()
            .Property(r => r.Text)
            .HasMaxLength(2000);
    }
}
