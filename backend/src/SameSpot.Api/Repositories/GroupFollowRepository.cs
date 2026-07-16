using Microsoft.EntityFrameworkCore;
using SameSpot.Api.Data;
using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public class GroupFollowRepository(AppDbContext db) : IGroupFollowRepository
{
    public Task<bool> ExistsAsync(Guid userId, Guid musicItemId) =>
        db.GroupFollows.AnyAsync(f => f.UserId == userId && f.MusicItemId == musicItemId);

    public async Task AddAsync(GroupFollow follow) => await db.GroupFollows.AddAsync(follow);

    public async Task RemoveAsync(Guid userId, Guid musicItemId)
    {
        var follow = await db.GroupFollows.FindAsync(userId, musicItemId);
        if (follow is not null)
        {
            db.GroupFollows.Remove(follow);
        }
    }

    public Task<List<Guid>> GetFollowedGroupIdsAsync(Guid userId) =>
        db.GroupFollows.Where(f => f.UserId == userId)
            .Select(f => f.MusicItemId)
            .ToListAsync();

    public Task SaveChangesAsync() => db.SaveChangesAsync();
}
