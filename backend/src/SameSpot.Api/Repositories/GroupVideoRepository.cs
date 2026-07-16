using Microsoft.EntityFrameworkCore;
using SameSpot.Api.Data;
using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public class GroupVideoRepository(AppDbContext db) : IGroupVideoRepository
{
    public Task<List<GroupVideo>> GetByItemAsync(Guid musicItemId) =>
        db.GroupVideos.Where(v => v.MusicItemId == musicItemId)
            .OrderBy(v => v.CreatedAt)
            .ToListAsync();

    public async Task AddAsync(GroupVideo video) => await db.GroupVideos.AddAsync(video);

    public Task SaveChangesAsync() => db.SaveChangesAsync();
}
