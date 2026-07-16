namespace SameSpot.Api.Models;

// Una canción dentro de una estantería, con el porqué de quien la puso.
// Sin moderación en el MVP: cualquiera puede proponer una, igual que los
// grupos locales.
public class ListaItem
{
    public Guid Id { get; set; }

    public Guid ListaId { get; set; }
    public Lista Lista { get; set; } = null!;

    public Guid MusicItemId { get; set; }
    public MusicItem MusicItem { get; set; } = null!;

    public Guid AddedByUserId { get; set; }
    public User AddedByUser { get; set; } = null!;

    public required string Text { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
