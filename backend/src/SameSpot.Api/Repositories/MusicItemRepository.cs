using Microsoft.EntityFrameworkCore;
using SameSpot.Api.Data;
using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public class MusicItemRepository(AppDbContext db) : IMusicItemRepository
{
    public Task<MusicItem?> GetByIdAsync(Guid id) =>
        db.MusicItems.FirstOrDefaultAsync(i => i.Id == id);

    public Task<MusicItem?> GetBySpotifyIdAsync(MusicItemType type, string spotifyId) =>
        db.MusicItems.FirstOrDefaultAsync(i => i.Type == type && i.SpotifyId == spotifyId);

    // Búsqueda por nombre para reutilizar grupos que ya creó otro usuario
    public Task<List<MusicItem>> SearchLocalGroupsAsync(string query) =>
        db.MusicItems
            .Where(i => i.Type == MusicItemType.LocalGroup && EF.Functions.ILike(i.Name, $"%{query}%"))
            .OrderBy(i => i.Name)
            .Take(20)
            .ToListAsync();

    // Para el "Cerca de ti" del onboarding: los grupos de una provincia
    public Task<List<MusicItem>> GetLocalGroupsByProvinceAsync(string province, int limit) =>
        db.MusicItems
            .Where(i => i.Type == MusicItemType.LocalGroup && i.Province == province)
            .OrderBy(i => i.Name)
            .Take(limit)
            .ToListAsync();

    public Task AddAsync(MusicItem item) => db.MusicItems.AddAsync(item).AsTask();

    public Task SaveChangesAsync() => db.SaveChangesAsync();
}
