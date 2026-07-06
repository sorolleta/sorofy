using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public interface INoteLikeRepository
{
    Task<NoteLike?> GetAsync(Guid noteId, Guid userId);
    Task<List<Guid>> GetLikedNoteIdsAsync(Guid userId, List<Guid> noteIds);
    Task<List<NoteLike>> GetForAuthorNotesAsync(Guid authorId, List<Guid> noteIds);
    Task AddAsync(NoteLike like);
    void Remove(NoteLike like);
    Task SaveChangesAsync();
}
