namespace SameSpot.Api.Models;

// Seguir un grupo local (charanga, banda...): sus notas entran en tu
// círculo del feed aunque no sigas a quien las escribió.
public class GroupFollow
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid MusicItemId { get; set; }
    public MusicItem MusicItem { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
