namespace SameSpot.Api.Models;

public class User
{
    public Guid Id { get; set; }
    public required string SpotifyId { get; set; }
    public required string DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // La playlist "Mis Descubrimientos de Sorofy" en su Spotify; se crea
    // la primera vez que guarda una canción
    public string? DiscoveriesPlaylistId { get; set; }

    // Rellenados en el onboarding obligatorio del primer login: la provincia
    // alimentará la proximidad local y los tags el mapeo con perfiles afines
    public string? Province { get; set; }
    public DateTime? OnboardingCompletedAt { get; set; }
    public List<Tag> Tags { get; set; } = [];

    // Última vez que abrió Ecos: todo lo posterior es "no leído"
    public DateTime? LastEcosReadAt { get; set; }

    public SpotifyToken? SpotifyToken { get; set; }

    public List<TopArtist> TopArtists { get; set; } = [];
    public List<TopTrack> TopTracks { get; set; } = [];

    // Relaciones de seguimiento: a quién sigue este usuario y quién le sigue
    public List<Follow> Following { get; set; } = [];
    public List<Follow> Followers { get; set; } = [];
}
