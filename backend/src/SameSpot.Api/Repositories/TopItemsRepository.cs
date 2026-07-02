using Microsoft.EntityFrameworkCore;
using SameSpot.Api.Data;
using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public class TopItemsRepository(AppDbContext db) : ITopItemsRepository
{
    public Task<List<TopArtist>> GetTopArtistsAsync(Guid userId) =>
        db.TopArtists.Where(a => a.UserId == userId)
            .OrderBy(a => a.Rank)
            .ToListAsync();

    public Task<List<TopTrack>> GetTopTracksAsync(Guid userId) =>
        db.TopTracks.Where(t => t.UserId == userId)
            .OrderBy(t => t.Rank)
            .ToListAsync();

    // Borra los tops anteriores e inserta los nuevos en un único SaveChanges,
    // es decir, en una única transacción: nunca queda un estado a medias.
    public async Task ReplaceTopsAsync(Guid userId, List<TopArtist> artists, List<TopTrack> tracks)
    {
        db.TopArtists.RemoveRange(db.TopArtists.Where(a => a.UserId == userId));
        db.TopTracks.RemoveRange(db.TopTracks.Where(t => t.UserId == userId));
        db.TopArtists.AddRange(artists);
        db.TopTracks.AddRange(tracks);
        await db.SaveChangesAsync();
    }
}
