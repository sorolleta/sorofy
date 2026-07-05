using Microsoft.EntityFrameworkCore;
using SameSpot.Api.Data;
using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public class NoteRepository(AppDbContext db) : INoteRepository
{
    // La bitácora del usuario: sus notas de la más reciente a la más antigua
    public Task<List<Note>> GetByUserAsync(Guid userId) =>
        db.Notes.Include(n => n.MusicItem)
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

    public Task<Note?> GetByIdAsync(Guid id) =>
        db.Notes.Include(n => n.MusicItem).FirstOrDefaultAsync(n => n.Id == id);

    // La ficha de un item: todas las notas de todo el mundo sobre él
    public Task<List<Note>> GetByItemAsync(Guid musicItemId) =>
        db.Notes.Include(n => n.MusicItem).Include(n => n.User)
            .Where(n => n.MusicItemId == musicItemId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

    // Las candidatas del feed: lo último del círculo del usuario, con el
    // autor cargado para pintar la tarjeta
    public Task<List<Note>> GetRecentByAuthorsAsync(List<Guid> authorIds, int limit) =>
        db.Notes.Include(n => n.MusicItem).Include(n => n.User)
            .Where(n => authorIds.Contains(n.UserId))
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .ToListAsync();

    // El "horizonte": lo último de la gente que el usuario no sigue
    public Task<List<Note>> GetRecentExcludingAuthorsAsync(List<Guid> excludedAuthorIds, int limit) =>
        db.Notes.Include(n => n.MusicItem).Include(n => n.User)
            .Where(n => !excludedAuthorIds.Contains(n.UserId))
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .ToListAsync();

    // Recomendaciones dirigidas: notas de desconocidos ancladas a artistas
    // que el lector ya escucha ("si te gusta X...")
    public Task<List<Note>> GetRecentAnchoredForArtistsAsync(
        List<string> artistSpotifyIds, List<Guid> excludedAuthorIds, int limit) =>
        db.Notes.Include(n => n.MusicItem).Include(n => n.User)
            .Where(n => n.AnchorArtistSpotifyId != null
                && artistSpotifyIds.Contains(n.AnchorArtistSpotifyId)
                && !excludedAuthorIds.Contains(n.UserId))
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .ToListAsync();

    // Proximidad local: notas de desconocidos sobre grupos de tu provincia
    // (la charanga de tu pueblo te encuentra sin necesidad de follow)
    public Task<List<Note>> GetRecentLocalForProvinceAsync(
        string province, List<Guid> excludedAuthorIds, int limit) =>
        db.Notes.Include(n => n.MusicItem).Include(n => n.User)
            .Where(n => n.MusicItem.Type == MusicItemType.LocalGroup
                && n.MusicItem.Province == province
                && !excludedAuthorIds.Contains(n.UserId))
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .ToListAsync();

    public Task AddAsync(Note note) => db.Notes.AddAsync(note).AsTask();

    public void Remove(Note note) => db.Notes.Remove(note);

    public Task SaveChangesAsync() => db.SaveChangesAsync();
}
