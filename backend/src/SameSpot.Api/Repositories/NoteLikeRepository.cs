using Microsoft.EntityFrameworkCore;
using SameSpot.Api.Data;
using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public class NoteLikeRepository(AppDbContext db) : INoteLikeRepository
{
    public Task<NoteLike?> GetAsync(Guid noteId, Guid userId) =>
        db.NoteLikes.FirstOrDefaultAsync(l => l.NoteId == noteId && l.UserId == userId);

    // Cuáles de estas notas he marcado yo, para pintar el corazón en las tarjetas
    public Task<List<Guid>> GetLikedNoteIdsAsync(Guid userId, List<Guid> noteIds) =>
        db.NoteLikes.Where(l => l.UserId == userId && noteIds.Contains(l.NoteId))
            .Select(l => l.NoteId)
            .ToListAsync();

    // Los "me llega" de las notas de un autor, con quién los dio (señal íntima:
    // el controller solo lo consulta para las notas del propio usuario)
    public Task<List<NoteLike>> GetForAuthorNotesAsync(Guid authorId, List<Guid> noteIds) =>
        db.NoteLikes.Where(l => noteIds.Contains(l.NoteId) && l.Note.UserId == authorId)
            .Include(l => l.User)
            .OrderBy(l => l.CreatedAt)
            .ToListAsync();

    // Para Ecos: los últimos "me llega" que ha recibido (nunca los suyos propios)
    public Task<List<NoteLike>> GetRecentReceivedAsync(Guid authorId, int limit) =>
        db.NoteLikes.Where(l => l.Note.UserId == authorId && l.UserId != authorId)
            .Include(l => l.User)
            .Include(l => l.Note).ThenInclude(n => n.MusicItem)
            .OrderByDescending(l => l.CreatedAt)
            .Take(limit)
            .ToListAsync();

    public Task AddAsync(NoteLike like) => db.NoteLikes.AddAsync(like).AsTask();

    public void Remove(NoteLike like) => db.NoteLikes.Remove(like);

    public Task SaveChangesAsync() => db.SaveChangesAsync();
}
