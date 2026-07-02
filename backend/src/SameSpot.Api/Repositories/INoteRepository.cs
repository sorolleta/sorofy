using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public interface INoteRepository
{
    Task<List<Note>> GetByUserAsync(Guid userId);
    Task<Note?> GetByIdAsync(Guid id);
    Task AddAsync(Note note);
    void Remove(Note note);
    Task SaveChangesAsync();
}
