using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id);
    Task<User?> GetByIdWithTagsAsync(Guid id);
    Task<User?> GetBySpotifyIdAsync(string spotifyId);
    Task<List<User>> GetAllExceptAsync(Guid userId);
    Task AddAsync(User user);
    Task SaveChangesAsync();
}
