namespace SameSpot.Api.Models;

// Reseña de un álbum o canción al estilo Letterboxd: nota + texto opcional.
public class Review
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public ReviewItemType ItemType { get; set; }
    public required string SpotifyItemId { get; set; }

    // Metadatos copiados de Spotify al crear la reseña: así pintamos listas
    // de reseñas sin volver a llamar a su API (los endpoints batch
    // desaparecieron con los recortes de feb. 2026).
    public required string ItemName { get; set; }
    public required string ArtistName { get; set; }
    public string? ImageUrl { get; set; }

    // Nota en medias estrellas: 1 = media estrella, 10 = cinco estrellas.
    // Guardar un entero evita los líos de redondeo de los decimales.
    public int RatingHalfStars { get; set; }
    public string? Text { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public enum ReviewItemType
{
    Album = 0,
    Track = 1,
}
