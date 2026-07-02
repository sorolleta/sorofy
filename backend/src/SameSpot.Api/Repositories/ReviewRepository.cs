using Microsoft.EntityFrameworkCore;
using SameSpot.Api.Data;
using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public class ReviewRepository(AppDbContext db) : IReviewRepository
{
    public Task<List<Review>> GetByUserAsync(Guid userId) =>
        db.Reviews.Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

    public Task<Review?> GetByIdAsync(Guid id) =>
        db.Reviews.FirstOrDefaultAsync(r => r.Id == id);

    public Task<Review?> GetByUserAndItemAsync(Guid userId, ReviewItemType itemType, string spotifyItemId) =>
        db.Reviews.FirstOrDefaultAsync(r =>
            r.UserId == userId && r.ItemType == itemType && r.SpotifyItemId == spotifyItemId);

    public Task AddAsync(Review review) => db.Reviews.AddAsync(review).AsTask();

    public void Remove(Review review) => db.Reviews.Remove(review);

    public Task SaveChangesAsync() => db.SaveChangesAsync();
}
