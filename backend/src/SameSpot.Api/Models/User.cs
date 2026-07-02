namespace SameSpot.Api.Models;

public class User
{
    public Guid Id { get; set; }
    public required string SpotifyId { get; set; }
    public required string DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public SpotifyToken? SpotifyToken { get; set; }

    public List<TopArtist> TopArtists { get; set; } = [];
    public List<TopTrack> TopTracks { get; set; } = [];

    // Relaciones de seguimiento: a quién sigue este usuario y quién le sigue
    public List<Follow> Following { get; set; } = [];
    public List<Follow> Followers { get; set; } = [];
}
