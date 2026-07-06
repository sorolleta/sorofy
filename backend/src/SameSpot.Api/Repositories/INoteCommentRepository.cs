using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public interface INoteCommentRepository
{
    Task<NoteComment?> GetByIdAsync(Guid id);
    Task<List<NoteComment>> GetThreadAsync(Guid noteId);
    Task<List<Guid>> GetNoteIdsWithCommentsAsync(List<Guid> noteIds);
    Task AddAsync(NoteComment comment);
    void Remove(NoteComment comment);

    Task<CommentLike?> GetLikeAsync(Guid commentId, Guid userId);
    Task<List<Guid>> GetLikedCommentIdsAsync(Guid userId, List<Guid> commentIds);
    Task<Dictionary<Guid, int>> GetLikeCountsAsync(List<Guid> commentIds);
    Task AddLikeAsync(CommentLike like);
    void RemoveLike(CommentLike like);

    Task SaveChangesAsync();
}
