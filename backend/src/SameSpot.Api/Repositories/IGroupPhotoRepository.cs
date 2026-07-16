using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public interface IGroupPhotoRepository
{
    Task<List<GroupPhoto>> GetByItemAsync(Guid musicItemId);
    Task<GroupPhoto?> GetByIdAsync(Guid id);
    Task AddAsync(GroupPhoto photo);
    void Remove(GroupPhoto photo);
    Task SaveChangesAsync();
}
