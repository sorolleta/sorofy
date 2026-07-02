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

    public Task AddAsync(Note note) => db.Notes.AddAsync(note).AsTask();

    public void Remove(Note note) => db.Notes.Remove(note);

    public Task SaveChangesAsync() => db.SaveChangesAsync();
}
