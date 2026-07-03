using SameSpot.Api.Models;
using SameSpot.Api.Repositories;

namespace SameSpot.Api.Services;

// Construye los dos flujos del feed: las tarjetas de notas rankeadas por el
// FeedRanker y la franja de "qué están escuchando ahora" los seguidos.
public class FeedService(
    IFollowRepository follows,
    INoteRepository notes,
    IDiscoveryRepository discoveries,
    ITopItemsRepository tops,
    AffinityService affinity,
    FeedRanker ranker,
    SpotifyApiService spotify)
{
    // Cuántas notas recientes entran a puntuar en cada carga
    private const int CircleLimit = 50;
    private const int HorizonLimit = 10;

    public async Task<List<FeedNote>> GetNotesFeedAsync(Guid userId)
    {
        var following = await follows.GetFollowingUsersAsync(userId);
        var followingIds = following.Select(u => u.Id).ToList();
        List<Guid> excludedAuthors = [.. followingIds, userId];

        var circleNotes = await notes.GetRecentByAuthorsAsync(followingIds, CircleLimit);

        // Los artistas que el lector ya escucha: contra ellos se cruzan las
        // anclas "si te gusta X" de las notas
        var myTopArtistIds = (await tops.GetTopArtistsAsync(userId))
            .Select(a => a.SpotifyArtistId)
            .ToHashSet();

        // El horizonte: primero recomendaciones dirigidas (notas de
        // desconocidos ancladas a artistas que escucho), luego lo último
        List<Note> anchoredHorizon = myTopArtistIds.Count == 0
            ? []
            : await notes.GetRecentAnchoredForArtistsAsync(
                [.. myTopArtistIds], excludedAuthors, HorizonLimit);
        var generalHorizon = await notes.GetRecentExcludingAuthorsAsync(
            excludedAuthors, HorizonLimit);

        // Lo que ya guardaste no necesita volver a encontrarte: fuera del
        // feed, que el hueco lo ocupe algo por descubrir
        var savedItemIds = (await discoveries.GetSavedItemIdsAsync(userId)).ToHashSet();
        circleNotes = circleNotes.Where(n => !savedItemIds.Contains(n.MusicItemId)).ToList();

        var anchoredIds = anchoredHorizon.Select(n => n.Id).ToHashSet();
        var horizon = anchoredHorizon
            .Select(n => new HorizonCandidate(n, MatchesTaste: true))
            .Concat(generalHorizon
                .Where(n => !anchoredIds.Contains(n.Id))
                .Select(n => new HorizonCandidate(n, MatchesTaste: false)))
            .Where(h => !savedItemIds.Contains(h.Note.MusicItemId))
            .ToList();

        // La afinidad se calcula una vez por autor, no por nota
        var affinityByAuthor = new Dictionary<Guid, int>();
        foreach (var authorId in followingIds)
        {
            affinityByAuthor[authorId] = (await affinity.GetAffinityAsync(userId, authorId)).Score;
        }

        var candidates = circleNotes
            .Select(n => new FeedCandidate(n, affinityByAuthor[n.UserId]))
            .ToList();

        var ranked = ranker.Rank(candidates, horizon, DateTime.UtcNow);

        // La explicación de la tarjeta ("te llega por X, que ya escuchas")
        // solo cuando el ancla coincide de verdad con los tops del lector
        return ranked
            .Select(n => new FeedNote(n,
                n.AnchorArtistSpotifyId is not null && myTopArtistIds.Contains(n.AnchorArtistSpotifyId)
                    ? n.AnchorArtistName
                    : null))
            .ToList();
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

// Una nota del feed con su explicación opcional: el artista ancla que la
// trajo hasta este lector (null si llegó por círculo u horizonte normal)
public record FeedNote(Note Note, string? BecauseArtist);

public record FeedItem(Guid UserId, string DisplayName, string? AvatarUrl, NowPlayingInfo? NowPlaying);

public record NowPlayingInfo(string Track, string Artist);
