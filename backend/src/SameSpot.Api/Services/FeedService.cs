using SameSpot.Api.Models;
using SameSpot.Api.Repositories;

namespace SameSpot.Api.Services;

// Construye los dos flujos del feed: las tarjetas de notas rankeadas por el
// FeedRanker y la franja de "qué están escuchando ahora" los seguidos.
public class FeedService(
    IFollowRepository follows,
    INoteRepository notes,
    AffinityService affinity,
    FeedRanker ranker,
    SpotifyApiService spotify)
{
    // Cuántas notas recientes entran a puntuar en cada carga
    private const int CircleLimit = 50;
    private const int HorizonLimit = 10;

    public async Task<List<Note>> GetNotesFeedAsync(Guid userId)
    {
        var following = await follows.GetFollowingUsersAsync(userId);
        var followingIds = following.Select(u => u.Id).ToList();

        var circleNotes = await notes.GetRecentByAuthorsAsync(followingIds, CircleLimit);
        // El horizonte: notas de gente que no sigo (ni mías)
        var horizonNotes = await notes.GetRecentExcludingAuthorsAsync(
            [.. followingIds, userId], HorizonLimit);

        // La afinidad se calcula una vez por autor, no por nota
        var affinityByAuthor = new Dictionary<Guid, int>();
        foreach (var authorId in followingIds)
        {
            affinityByAuthor[authorId] = (await affinity.GetAffinityAsync(userId, authorId)).Score;
        }

        var candidates = circleNotes
            .Select(n => new FeedCandidate(n, affinityByAuthor[n.UserId]))
            .ToList();

        return ranker.Rank(candidates, horizonNotes, DateTime.UtcNow);
    }

    public async Task<List<FeedItem>> GetNowPlayingFeedAsync(Guid userId)
    {
        var following = await follows.GetFollowingUsersAsync(userId);
        var feed = new List<FeedItem>();

        foreach (var user in following)
        {
            feed.Add(new FeedItem(
                user.Id,
                user.DisplayName,
                user.AvatarUrl,
                await GetNowPlayingSafeAsync(user.Id)));
        }

        // Primero quienes están escuchando algo ahora mismo
        return feed.OrderByDescending(i => i.NowPlaying is not null).ToList();
    }

    // El feed no puede caerse porque falle un solo usuario (token revocado,
    // Spotify caído...): ese usuario aparece como "no está escuchando nada".
    private async Task<NowPlayingInfo?> GetNowPlayingSafeAsync(Guid userId)
    {
        try
        {
            var nowPlaying = await spotify.GetNowPlayingAsync(userId);
            if (nowPlaying?.Item is null || !nowPlaying.IsPlaying) return null;

            return new NowPlayingInfo(
                nowPlaying.Item.Name,
                string.Join(", ", nowPlaying.Item.Artists.Select(a => a.Name)));
        }
        catch
        {
            return null;
        }
    }
}

public record FeedItem(Guid UserId, string DisplayName, string? AvatarUrl, NowPlayingInfo? NowPlaying);

public record NowPlayingInfo(string Track, string Artist);
