namespace SameSpot.Api.Models;

// Cualquier "cosa musical" sobre la que se puede escribir una nota: canción,
// álbum, artista de Spotify o grupo local (charanga, banda del pueblo...).
// Existe como tabla propia para que las notas, los slots del perfil y el
// contador de confianza apunten todos al mismo sitio.
public class MusicItem
{
    public Guid Id { get; set; }
    public MusicItemType Type { get; set; }

    // Null en los grupos locales: no existen en Spotify y los crean los
    // propios usuarios. Justo por eso esta tabla no depende de Spotify.
    public string? SpotifyId { get; set; }

    public required string Name { get; set; }

    // Null cuando el item ya ES un artista o grupo
    public string? ArtistName { get; set; }
    public string? ImageUrl { get; set; }

    // Contexto de los grupos locales: "los que cerraron San Juan 2024"
    public string? Description { get; set; }

    // La música de los grupos locales vive fuera de Spotify: enlaces
    // opcionales a YouTube/SoundCloud, validados con oEmbed al crear
    public string? YoutubeUrl { get; set; }
    public string? SoundcloudUrl { get; set; }

    // Solo grupos locales (obligatorios al crear): qué son y de dónde son.
    // La provincia alimenta la proximidad local del feed.
    public string? Category { get; set; }
    public string? Province { get; set; }

    public DateTime CreatedAt { get; set; }
}

// Album=0 y Track=1 conservan los valores del antiguo ReviewItemType para
// que la migración de reseñas a notas fuera una copia directa
public enum MusicItemType
{
    Album = 0,
    Track = 1,
    Artist = 2,
    LocalGroup = 3,
}
