using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public interface INoteRepository
{
    Task<List<Note>> GetByUserAsync(Guid userId);
    Task<List<Note>> GetByItemAsync(Guid musicItemId);
    Task<Note?> GetByIdAsync(Guid id);
    Task<List<Note>> GetRecentByAuthorsAsync(List<Guid> authorIds, int limit);
    Task<List<Note>> GetRecentExcludingAuthorsAsync(List<Guid> excludedAuthorIds, int limit);
    Task<List<Note>> GetRecentAnchoredForArtistsAsync(
        List<string> artistSpotifyIds, List<Guid> excludedAuthorIds, int limit);
    Task<List<Note>> GetRecentLocalForProvinceAsync(
        string province, List<Guid> excludedAuthorIds, int limit);
    Task AddAsync(Note note);
    void Remove(Note note);
    Task SaveChangesAsync();
}
