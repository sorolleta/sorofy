namespace SameSpot.Api.Models;

public class TopTrack
{
    public long Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public required string SpotifyTrackId { get; set; }
    public required string Name { get; set; }
    public required string ArtistName { get; set; }
    public int Rank { get; set; }
    public DateTime FetchedAt { get; set; }
}
