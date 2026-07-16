using Microsoft.EntityFrameworkCore;
using SameSpot.Api.Data;
using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public class DiscoveryRepository(AppDbContext db) : IDiscoveryRepository
{
    public Task<Discovery?> GetByUserAndItemAsync(Guid userId, Guid musicItemId) =>
        db.Discoveries.FirstOrDefaultAsync(d => d.UserId == userId && d.MusicItemId == musicItemId);

    // Qué items tiene ya guardados el usuario, para marcarlos en el feed
    public Task<List<Guid>> GetSavedItemIdsAsync(Guid userId) =>
        db.Discoveries.Where(d => d.UserId == userId)
            .Select(d => d.MusicItemId)
            .ToListAsync();

    // El contador de confianza: cuánto he guardado gracias a este autor
    public Task<int> CountByAuthorAsync(Guid userId, Guid authorId) =>
        db.Discoveries.CountAsync(d => d.UserId == userId && d.AuthorId == authorId);

    // Para Ecos: quién guardó algo gracias a sus notas
    public Task<List<Discovery>> GetRecentByAuthorAsync(Guid authorId, int limit) =>
        db.Discoveries.Where(d => d.AuthorId == authorId && d.UserId != authorId)
            .Include(d => d.User)
            .Include(d => d.MusicItem)
            .OrderByDescending(d => d.SavedAt)
            .Take(limit)
            .ToListAsync();

    // Para "en tu círculo" en la ficha: quién de mi gente ya lo tiene guardado
    public Task<List<Discovery>> GetByItemAsync(Guid musicItemId) =>
        db.Discoveries.Where(d => d.MusicItemId == musicItemId)
            .Include(d => d.User)
            .OrderBy(d => d.SavedAt)
            .ToListAsync();

    public Task AddAsync(Discovery discovery) => db.Discoveries.AddAsync(discovery).AsTask();

    public Task SaveChangesAsync() => db.SaveChangesAsync();
}
