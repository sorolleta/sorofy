using Microsoft.EntityFrameworkCore;
using SameSpot.Api.Data;
using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public class SpotifyTokenRepository(AppDbContext db) : ISpotifyTokenRepository
{
    public Task<SpotifyToken?> GetByUserIdAsync(Guid userId) =>
        db.SpotifyTokens.FirstOrDefaultAsync(t => t.UserId == userId);

    public Task SaveChangesAsync() => db.SaveChangesAsync();
}
