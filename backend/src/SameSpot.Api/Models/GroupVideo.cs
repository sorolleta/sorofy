namespace SameSpot.Api.Models;

// Un vídeo adicional de un grupo local, más allá del que tiñe la cabecera
// de su ficha (MusicItem.YoutubeUrl). Se añaden todos de golpe al crear el
// grupo, como en el formulario; sin edición posterior en el MVP.
public class GroupVideo
{
    public Guid Id { get; set; }

    public Guid MusicItemId { get; set; }
    public MusicItem MusicItem { get; set; } = null!;

    public required string Url { get; set; }
    public string? ThumbnailUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
