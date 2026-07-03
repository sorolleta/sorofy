namespace SameSpot.Api.Models;

// Una nota estilo diario: el contexto humano de una música ("llevo tres días
// con este puente en bucle"). Sin puntuación numérica a propósito: esto no
// es un tablón de reseñas. Un usuario puede escribir varias notas sobre el
// mismo item a lo largo del tiempo (su bitácora).
public class Note
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid MusicItemId { get; set; }
    public MusicItem MusicItem { get; set; } = null!;

    public string? Text { get; set; }

    // El "vibe": color + emoji + etiqueta ("Carretera Nocturna") elegidos de
    // un clic, para cuando no apetece escribir. Una nota necesita al menos
    // texto o vibe (se valida en el controller).
    public string? VibeColor { get; set; }
    public string? VibeEmoji { get; set; }
    public string? VibeLabel { get; set; }

    // El ancla de recomendación: "si te gusta X, esto te puede gustar".
    // El feed la cruza con los top artistas de cada lector para llevarle
    // la nota aunque no siga al autor. Guardamos el nombre canónico de
    // Spotify para pintarla sin más llamadas.
    public string? AnchorArtistSpotifyId { get; set; }
    public string? AnchorArtistName { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
