using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public interface IGroupVideoRepository
{
    Task<List<GroupVideo>> GetByItemAsync(Guid musicItemId);
    Task AddAsync(GroupVideo video);
    Task SaveChangesAsync();
}
