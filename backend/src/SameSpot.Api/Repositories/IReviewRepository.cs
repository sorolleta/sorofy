using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public interface IReviewRepository
{
    Task<List<Review>> GetByUserAsync(Guid userId);
    Task<Review?> GetByIdAsync(Guid id);
    Task<Review?> GetByUserAndItemAsync(Guid userId, ReviewItemType itemType, string spotifyItemId);
    Task AddAsync(Review review);
    void Remove(Review review);
    Task SaveChangesAsync();
}
