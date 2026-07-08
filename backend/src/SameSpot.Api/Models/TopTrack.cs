namespace SameSpot.Api.Models;

public class TopTrack
{
    public long Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public required string SpotifyTrackId { get; set; }
    public required string Name { get; set; }
    public required string ArtistName { get; set; }

    // Carátula y álbum de origen: la carátula viste tops y podio, y del
    // álbum salen los "álbumes más queridos" (Spotify no da tops de álbum)
    public string? ImageUrl { get; set; }
    public string? AlbumSpotifyId { get; set; }
    public string? AlbumName { get; set; }
    public int Rank { get; set; }
    public DateTime FetchedAt { get; set; }
}
