using Microsoft.EntityFrameworkCore;
using SameSpot.Api.Data;
using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public class FollowRepository(AppDbContext db) : IFollowRepository
{
    public Task<bool> ExistsAsync(Guid followerId, Guid followingId) =>
        db.Follows.AnyAsync(f => f.FollowerId == followerId && f.FollowingId == followingId);

    public async Task AddAsync(Follow follow) => await db.Follows.AddAsync(follow);

    public async Task RemoveAsync(Guid followerId, Guid followingId)
    {
        var follow = await db.Follows.FindAsync(followerId, followingId);
        if (follow is not null)
        {
            db.Follows.Remove(follow);
        }
    }

    public Task<List<User>> GetFollowingUsersAsync(Guid followerId) =>
        db.Follows.Where(f => f.FollowerId == followerId)
            .Select(f => f.Following)
            .ToListAsync();

    // Para Ecos: quién ha empezado a seguirte hace poco
    public Task<List<Follow>> GetRecentFollowersAsync(Guid userId, int limit) =>
        db.Follows.Where(f => f.FollowingId == userId)
            .Include(f => f.Follower)
            .OrderByDescending(f => f.CreatedAt)
            .Take(limit)
            .ToListAsync();

    public Task<int> CountFollowersAsync(Guid userId) =>
        db.Follows.CountAsync(f => f.FollowingId == userId);

    public Task<int> CountFollowingAsync(Guid userId) =>
        db.Follows.CountAsync(f => f.FollowerId == userId);

    public Task SaveChangesAsync() => db.SaveChangesAsync();
}
