namespace SameSpot.Api.Models;

public class TopArtist
{
    public long Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public required string SpotifyArtistId { get; set; }
    public required string Name { get; set; }
    public List<string> Genres { get; set; } = [];
    public int Rank { get; set; }
    public DateTime FetchedAt { get; set; }
}
