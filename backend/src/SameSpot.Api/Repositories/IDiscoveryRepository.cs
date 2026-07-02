using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public interface IDiscoveryRepository
{
    Task<Discovery?> GetByUserAndItemAsync(Guid userId, Guid musicItemId);
    Task<List<Guid>> GetSavedItemIdsAsync(Guid userId);
    Task<int> CountByAuthorAsync(Guid userId, Guid authorId);
    Task AddAsync(Discovery discovery);
    Task SaveChangesAsync();
}
