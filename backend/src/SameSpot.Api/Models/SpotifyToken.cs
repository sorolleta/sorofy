namespace SameSpot.Api.Models;

// Un token por usuario: UserId es clave primaria y foránea a la vez
public class SpotifyToken
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public required string AccessToken { get; set; }
    public required string RefreshToken { get; set; }
    public DateTime ExpiresAt { get; set; }
}
