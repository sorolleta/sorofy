namespace SameSpot.Api.Models;

// Una foto real de un grupo local (directo, ensayo...), subida por
// cualquier usuario. Guardada en disco, no en un proveedor externo:
// es un proyecto de portfolio, no hace falta esa infraestructura.
public class GroupPhoto
{
    public Guid Id { get; set; }

    public Guid MusicItemId { get; set; }
    public MusicItem MusicItem { get; set; } = null!;

    public required string Url { get; set; }

    public Guid UploadedByUserId { get; set; }
    public User UploadedByUser { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
