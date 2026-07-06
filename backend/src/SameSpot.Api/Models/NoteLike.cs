namespace SameSpot.Api.Models;

// El "me llega" de una nota. Sin contador público a propósito: el número
// y los nombres solo los ve el autor de la nota (como el contador de
// confianza, es una señal íntima, no una carrera de popularidad).
public class NoteLike
{
    public Guid NoteId { get; set; }
    public Note Note { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime CreatedAt { get; set; }
}
