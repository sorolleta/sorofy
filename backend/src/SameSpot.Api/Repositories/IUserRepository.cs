using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id);
    Task<User?> GetByIdWithTagsAsync(Guid id);
    Task<User?> GetBySpotifyIdAsync(string spotifyId);
    Task<List<User>> GetAllExceptAsync(Guid userId);
    Task<List<User>> GetAllExceptWithTagsAsync(Guid userId);
    Task AddAsync(User user);
    Task SetLastEcosReadAtAsync(Guid userId, DateTime at);
    Task SaveChangesAsync();
}
