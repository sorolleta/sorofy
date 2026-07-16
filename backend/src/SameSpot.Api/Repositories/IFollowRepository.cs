using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public interface IFollowRepository
{
    Task<bool> ExistsAsync(Guid followerId, Guid followingId);
    Task AddAsync(Follow follow);
    Task RemoveAsync(Guid followerId, Guid followingId);
    Task<List<User>> GetFollowingUsersAsync(Guid followerId);
    Task<List<Follow>> GetRecentFollowersAsync(Guid userId, int limit);
    Task<int> CountFollowersAsync(Guid userId);
    Task<int> CountFollowingAsync(Guid userId);
    Task SaveChangesAsync();
}
