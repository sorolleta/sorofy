namespace SameSpot.Api.Models;

// Guardar una estantería de otra persona para volver a ella
public class ListaSave
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid ListaId { get; set; }
    public Lista Lista { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
