using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public interface IMusicItemRepository
{
    Task<MusicItem?> GetByIdAsync(Guid id);
    Task<MusicItem?> GetBySpotifyIdAsync(MusicItemType type, string spotifyId);
    Task<List<MusicItem>> SearchLocalGroupsAsync(string query);
    Task AddAsync(MusicItem item);
    Task SaveChangesAsync();
}
