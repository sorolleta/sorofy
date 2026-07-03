using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public interface ITagRepository
{
    Task<List<Tag>> GetAllAsync();
    Task<List<Tag>> GetByIdsAsync(IEnumerable<int> ids);
}
