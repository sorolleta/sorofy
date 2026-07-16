using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public interface IGroupFollowRepository
{
    Task<bool> ExistsAsync(Guid userId, Guid musicItemId);
    Task AddAsync(GroupFollow follow);
    Task RemoveAsync(Guid userId, Guid musicItemId);
    Task<List<Guid>> GetFollowedGroupIdsAsync(Guid userId);
    Task SaveChangesAsync();
}
