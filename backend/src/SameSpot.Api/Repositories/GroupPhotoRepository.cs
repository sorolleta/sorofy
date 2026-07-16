using Microsoft.EntityFrameworkCore;
using SameSpot.Api.Data;
using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public class GroupPhotoRepository(AppDbContext db) : IGroupPhotoRepository
{
    public Task<List<GroupPhoto>> GetByItemAsync(Guid musicItemId) =>
        db.GroupPhotos.Where(p => p.MusicItemId == musicItemId)
            .Include(p => p.UploadedByUser)
            .OrderBy(p => p.CreatedAt)
            .ToListAsync();

    public Task<GroupPhoto?> GetByIdAsync(Guid id) =>
        db.GroupPhotos.FirstOrDefaultAsync(p => p.Id == id);

    public async Task AddAsync(GroupPhoto photo) => await db.GroupPhotos.AddAsync(photo);

    public void Remove(GroupPhoto photo) => db.GroupPhotos.Remove(photo);

    public Task SaveChangesAsync() => db.SaveChangesAsync();
}
