using Microsoft.EntityFrameworkCore;
using SameSpot.Api.Data;
using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public class TagRepository(AppDbContext db) : ITagRepository
{
    // En el orden del catálogo (Id), no alfabético: el seed ya está curado
    public Task<List<Tag>> GetAllAsync() =>
        db.Tags.OrderBy(t => t.Id).ToListAsync();

    public Task<List<Tag>> GetByIdsAsync(IEnumerable<int> ids) =>
        db.Tags.Where(t => ids.Contains(t.Id)).ToListAsync();
}
