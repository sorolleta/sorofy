namespace SameSpot.Api.Models;

// Una estantería: colección hecha a mano, con un porqué en cada canción.
// Sin algoritmo ni autoplay — cada item lleva la voz de quien lo puso.
public class Lista
{
    public Guid Id { get; set; }

    public required string Title { get; set; }
    // El ambiente/uso de la lista: "para pedalear de noche sin prisa"
    public string? Mood { get; set; }

    public Guid CuratorId { get; set; }
    public User Curator { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<ListaItem> Items { get; set; } = [];
}
