using Microsoft.EntityFrameworkCore;
using SameSpot.Api.Data;
using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public class UserRepository(AppDbContext db) : IUserRepository
{
    public Task<User?> GetByIdAsync(Guid id) =>
        db.Users.FirstOrDefaultAsync(u => u.Id == id);

    public Task<User?> GetByIdWithTagsAsync(Guid id) =>
        db.Users.Include(u => u.Tags)
            .FirstOrDefaultAsync(u => u.Id == id);

    public Task<User?> GetBySpotifyIdAsync(string spotifyId) =>
        db.Users.Include(u => u.SpotifyToken)
            .FirstOrDefaultAsync(u => u.SpotifyId == spotifyId);

    public Task<List<User>> GetAllExceptAsync(Guid userId) =>
        db.Users.Where(u => u.Id != userId)
            .OrderBy(u => u.DisplayName)
            .ToListAsync();

    // Para las sugerencias del onboarding: con los tags cargados se explica
    // por qué se sugiere a cada persona ("le gusta charanga y fiesta")
    public Task<List<User>> GetAllExceptWithTagsAsync(Guid userId) =>
        db.Users.Where(u => u.Id != userId)
            .Include(u => u.Tags)
            .OrderBy(u => u.DisplayName)
            .ToListAsync();

    public async Task AddAsync(User user) => await db.Users.AddAsync(user);

    public async Task SetLastEcosReadAtAsync(Guid userId, DateTime at)
    {
        var user = await db.Users.FindAsync(userId);
        if (user is null) return;
        user.LastEcosReadAt = at;
        await db.SaveChangesAsync();
    }

    public Task SaveChangesAsync() => db.SaveChangesAsync();
}
