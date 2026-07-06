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
    public DbSet<Discovery> Discoveries => Set<Discovery>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<NoteLike> NoteLikes => Set<NoteLike>();
    public DbSet<NoteComment> NoteComments => Set<NoteComment>();
    public DbSet<CommentLike> CommentLikes => Set<CommentLike>();

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

        modelBuilder.Entity<MusicItem>()
            .Property(i => i.YoutubeUrl)
            .HasMaxLength(300);

        modelBuilder.Entity<MusicItem>()
            .Property(i => i.SoundcloudUrl)
            .HasMaxLength(300);

        modelBuilder.Entity<MusicItem>()
            .Property(i => i.Category)
            .HasMaxLength(30);

        modelBuilder.Entity<MusicItem>()
            .Property(i => i.Province)
            .HasMaxLength(30);

        // La proximidad local busca grupos por provincia; el resto de
        // items (Province null) queda fuera del índice
        modelBuilder.Entity<MusicItem>()
            .HasIndex(i => i.Province)
            .HasFilter("\"Province\" IS NOT NULL");

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

        modelBuilder.Entity<Note>()
            .Property(n => n.ListenUrl)
            .HasMaxLength(300);

        modelBuilder.Entity<Note>()
            .Property(n => n.AnchorArtistSpotifyId)
            .HasMaxLength(50);

        modelBuilder.Entity<Note>()
            .Property(n => n.AnchorArtistName)
            .HasMaxLength(200);

        // El feed busca notas ancladas a los top artistas del lector; las
        // notas sin ancla quedan fuera del índice
        modelBuilder.Entity<Note>()
            .HasIndex(n => n.AnchorArtistSpotifyId)
            .HasFilter("\"AnchorArtistSpotifyId\" IS NOT NULL");

        // Una canción solo se descubre una vez por usuario
        modelBuilder.Entity<Discovery>()
            .HasIndex(d => new { d.UserId, d.MusicItemId })
            .IsUnique();

        modelBuilder.Entity<Discovery>()
            .HasOne(d => d.User)
            .WithMany()
            .HasForeignKey(d => d.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Discovery>()
            .HasOne(d => d.Author)
            .WithMany()
            .HasForeignKey(d => d.AuthorId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Discovery>()
            .HasOne(d => d.MusicItem)
            .WithMany()
            .HasForeignKey(d => d.MusicItemId)
            .OnDelete(DeleteBehavior.Cascade);

        // Si se borra la nota, el descubrimiento sobrevive sin ella
        modelBuilder.Entity<Discovery>()
            .HasOne(d => d.Note)
            .WithMany()
            .HasForeignKey(d => d.NoteId)
            .OnDelete(DeleteBehavior.SetNull);

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

        modelBuilder.Entity<Tag>()
            .Property(t => t.Name)
            .HasMaxLength(40);

        modelBuilder.Entity<Tag>()
            .HasIndex(t => t.Name)
            .IsUnique();

        modelBuilder.Entity<User>()
            .Property(u => u.Province)
            .HasMaxLength(30);

        // N:N usuario-tag; EF genera la tabla intermedia UserTags
        modelBuilder.Entity<User>()
            .HasMany(u => u.Tags)
            .WithMany()
            .UsingEntity("UserTags");

        // Un "me llega" por usuario y nota: clave compuesta
        modelBuilder.Entity<NoteLike>()
            .HasKey(l => new { l.NoteId, l.UserId });

        modelBuilder.Entity<NoteLike>()
            .HasOne(l => l.Note)
            .WithMany()
            .HasForeignKey(l => l.NoteId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<NoteLike>()
            .HasOne(l => l.User)
            .WithMany()
            .HasForeignKey(l => l.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<NoteComment>()
            .Property(c => c.Text)
            .HasMaxLength(1000);

        // El hilo de una nota se lee entero y en orden
        modelBuilder.Entity<NoteComment>()
            .HasIndex(c => new { c.NoteId, c.CreatedAt });

        modelBuilder.Entity<NoteComment>()
            .HasOne(c => c.Note)
            .WithMany()
            .HasForeignKey(c => c.NoteId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<NoteComment>()
            .HasOne(c => c.User)
            .WithMany()
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Borrar un comentario raíz se lleva sus respuestas
        modelBuilder.Entity<NoteComment>()
            .HasOne(c => c.ParentComment)
            .WithMany()
            .HasForeignKey(c => c.ParentCommentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CommentLike>()
            .HasKey(l => new { l.CommentId, l.UserId });

        modelBuilder.Entity<CommentLike>()
            .HasOne(l => l.Comment)
            .WithMany()
            .HasForeignKey(l => l.CommentId)
            .OnDelete(DeleteBehavior.Cascade);

        // Si el usuario se borra, sus likes se van con él (Postgres admite
        // rutas de cascada múltiples sin problema, no hace falta evitarlas)
        modelBuilder.Entity<CommentLike>()
            .HasOne(l => l.User)
            .WithMany()
            .HasForeignKey(l => l.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Catálogo inicial de tags estéticos (ids fijos para el seed)
        modelBuilder.Entity<Tag>().HasData(
            new Tag { Id = 1, Name = "Jazz nocturno" },
            new Tag { Id = 2, Name = "Post-punk" },
            new Tag { Id = 3, Name = "Charanga y fiesta" },
            new Tag { Id = 4, Name = "Indie de carretera" },
            new Tag { Id = 5, Name = "Cantautor e íntimo" },
            new Tag { Id = 6, Name = "Electrónica de baile" },
            new Tag { Id = 7, Name = "Ambient y calma" },
            new Tag { Id = 8, Name = "Flamenco y raíz" },
            new Tag { Id = 9, Name = "Hip-hop y rap" },
            new Tag { Id = 10, Name = "Rock clásico" },
            new Tag { Id = 11, Name = "Metal y ruido" },
            new Tag { Id = 12, Name = "Pop luminoso" },
            new Tag { Id = 13, Name = "Soul y funk" },
            new Tag { Id = 14, Name = "Clásica y bandas sonoras" },
            new Tag { Id = 15, Name = "Reggaetón y perreo" },
            new Tag { Id = 16, Name = "Folk y acústico" });
    }
}
