using Microsoft.EntityFrameworkCore;
using SameSpot.Api.Data;
using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public class NoteCommentRepository(AppDbContext db) : INoteCommentRepository
{
    public Task<NoteComment?> GetByIdAsync(Guid id) =>
        db.NoteComments.FirstOrDefaultAsync(c => c.Id == id);

    // El hilo entero de una nota en orden cronológico; el controller lo
    // agrupa en raíces y respuestas
    public Task<List<NoteComment>> GetThreadAsync(Guid noteId) =>
        db.NoteComments.Where(c => c.NoteId == noteId)
            .Include(c => c.User)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

    // Cuáles de estas notas tienen conversación (señal sí/no, sin contador)
    public Task<List<Guid>> GetNoteIdsWithCommentsAsync(List<Guid> noteIds) =>
        db.NoteComments.Where(c => noteIds.Contains(c.NoteId))
            .Select(c => c.NoteId)
            .Distinct()
            .ToListAsync();

    // Para Ecos: comentarios recientes en notas suyas (nunca los que él mismo escribió)
    public Task<List<NoteComment>> GetRecentReceivedAsync(Guid authorId, int limit) =>
        db.NoteComments.Where(c => c.Note.UserId == authorId && c.UserId != authorId)
            .Include(c => c.User)
            .Include(c => c.Note).ThenInclude(n => n.MusicItem)
            .OrderByDescending(c => c.CreatedAt)
            .Take(limit)
            .ToListAsync();

    public Task AddAsync(NoteComment comment) => db.NoteComments.AddAsync(comment).AsTask();

    public void Remove(NoteComment comment) => db.NoteComments.Remove(comment);

    public Task<CommentLike?> GetLikeAsync(Guid commentId, Guid userId) =>
        db.CommentLikes.FirstOrDefaultAsync(l => l.CommentId == commentId && l.UserId == userId);

    public Task<List<Guid>> GetLikedCommentIdsAsync(Guid userId, List<Guid> commentIds) =>
        db.CommentLikes.Where(l => l.UserId == userId && commentIds.Contains(l.CommentId))
            .Select(l => l.CommentId)
            .ToListAsync();

    // Recuento de "me llega" por comentario (el controller solo lo enseña
    // a quien escribió cada comentario)
    public Task<Dictionary<Guid, int>> GetLikeCountsAsync(List<Guid> commentIds) =>
        db.CommentLikes.Where(l => commentIds.Contains(l.CommentId))
            .GroupBy(l => l.CommentId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count);

    public Task AddLikeAsync(CommentLike like) => db.CommentLikes.AddAsync(like).AsTask();

    public void RemoveLike(CommentLike like) => db.CommentLikes.Remove(like);

    public Task SaveChangesAsync() => db.SaveChangesAsync();
}
