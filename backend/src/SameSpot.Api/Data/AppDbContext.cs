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
    public DbSet<MusicItem> MusicItems => Set<MusicItem>();
    public DbSet<Note> Notes => Set<Note>();
    public DbSet<Message> Messages => Set<Message>();

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

        // Un item de Spotify existe una sola vez en la tabla; los grupos
        // locales (SpotifyId null) quedan fuera del índice
        modelBuilder.Entity<MusicItem>()
            .HasIndex(i => new { i.Type, i.SpotifyId })
            .IsUnique()
            .HasFilter("\"SpotifyId\" IS NOT NULL");

        modelBuilder.Entity<MusicItem>()
            .Property(i => i.Description)
            .HasMaxLength(500);

        // La bitácora de un usuario se lee en orden cronológico
        modelBuilder.Entity<Note>()
            .HasIndex(n => new { n.UserId, n.CreatedAt });

        modelBuilder.Entity<Note>()
            .HasOne(n => n.User)
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Note>()
            .HasOne(n => n.MusicItem)
            .WithMany()
            .HasForeignKey(n => n.MusicItemId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Note>()
            .Property(n => n.Text)
            .HasMaxLength(2000);

        modelBuilder.Entity<Note>()
            .Property(n => n.VibeColor)
            .HasMaxLength(9);

        modelBuilder.Entity<Note>()
            .Property(n => n.VibeEmoji)
            .HasMaxLength(16);

        modelBuilder.Entity<Note>()
            .Property(n => n.VibeLabel)
            .HasMaxLength(40);

        modelBuilder.Entity<Message>()
            .HasOne(m => m.Sender)
            .WithMany()
            .HasForeignKey(m => m.SenderId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Message>()
            .HasOne(m => m.Recipient)
            .WithMany()
            .HasForeignKey(m => m.RecipientId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Message>()
            .Property(m => m.Text)
            .HasMaxLength(1000);

        // Una conversación se consulta en ambos sentidos
        modelBuilder.Entity<Message>()
            .HasIndex(m => new { m.SenderId, m.RecipientId, m.SentAt });

        modelBuilder.Entity<Message>()
            .HasIndex(m => new { m.RecipientId, m.SenderId, m.SentAt });
    }
}
