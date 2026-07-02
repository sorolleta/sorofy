using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public interface ISpotifyTokenRepository
{
    Task<SpotifyToken?> GetByUserIdAsync(Guid userId);
    Task SaveChangesAsync();
}
