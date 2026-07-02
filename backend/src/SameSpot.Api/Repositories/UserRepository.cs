using Microsoft.EntityFrameworkCore;
using SameSpot.Api.Data;
using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public class UserRepository(AppDbContext db) : IUserRepository
{
    public Task<User?> GetByIdAsync(Guid id) =>
        db.Users.FirstOrDefaultAsync(u => u.Id == id);

    public Task<User?> GetBySpotifyIdAsync(string spotifyId) =>
        db.Users.Include(u => u.SpotifyToken)
            .FirstOrDefaultAsync(u => u.SpotifyId == spotifyId);

    public Task<List<User>> GetAllExceptAsync(Guid userId) =>
        db.Users.Where(u => u.Id != userId)
            .OrderBy(u => u.DisplayName)
            .ToListAsync();

    public async Task AddAsync(User user) => await db.Users.AddAsync(user);

    public Task SaveChangesAsync() => db.SaveChangesAsync();
}
