using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public interface ITopItemsRepository
{
    Task<List<TopArtist>> GetTopArtistsAsync(Guid userId);
    Task<List<TopTrack>> GetTopTracksAsync(Guid userId);
    Task ReplaceTopsAsync(Guid userId, List<TopArtist> artists, List<TopTrack> tracks);
}
