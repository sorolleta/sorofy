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

    public Task AddAsync(Note note) => db.Notes.AddAsync(note).AsTask();

    public void Remove(Note note) => db.Notes.Remove(note);

    public Task SaveChangesAsync() => db.SaveChangesAsync();
}
