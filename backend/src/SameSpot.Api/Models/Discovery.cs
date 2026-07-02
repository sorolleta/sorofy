namespace SameSpot.Api.Models;

// Una canción guardada desde el feed: quién la guardó, gracias a quién la
// descubrió y qué canción era. Alimenta el contador de confianza ("has
// guardado 16 recomendaciones de Ana") y la futura ocultación en el feed.
public class Discovery
{
    public Guid Id { get; set; }

    // Quién guarda
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    // El autor de la nota que provocó el descubrimiento
    public Guid AuthorId { get; set; }
    public User Author { get; set; } = null!;

    public Guid MusicItemId { get; set; }
    public MusicItem MusicItem { get; set; } = null!;

    // La nota origen; queda a null si se borra (el descubrimiento sobrevive)
    public Guid? NoteId { get; set; }
    public Note? Note { get; set; }

    public DateTime SavedAt { get; set; }
}
