using SameSpot.Api.Models;
using SameSpot.Api.Repositories;

namespace SameSpot.Api.Services;

// Construye los dos flujos del feed: las tarjetas de notas rankeadas por el
// FeedRanker y la franja de "qué están escuchando ahora" los seguidos.
public class FeedService(
    IFollowRepository follows,
    IGroupFollowRepository groupFollows,
    INoteRepository notes,
    IDiscoveryRepository discoveries,
    ITopItemsRepository tops,
    IUserRepository users,
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

        // El horizonte, por orden de puntería: recomendaciones ancladas a
        // artistas que escucho, grupos locales de mi provincia y, de
        // relleno, lo último de desconocidos
        List<Note> anchoredHorizon = myTopArtistIds.Count == 0
            ? []
            : await notes.GetRecentAnchoredForArtistsAsync(
                [.. myTopArtistIds], excludedAuthors, HorizonLimit);

        var myProvince = (await users.GetByIdAsync(userId))?.Province;
        List<Note> localHorizon = myProvince is null
            ? []
            : await notes.GetRecentLocalForProvinceAsync(
                myProvince, excludedAuthors, HorizonLimit);

        // Grupos locales que sigues: sus notas te llegan aunque no sigas a
        // quien las escribió, igual que si fuera un usuario seguido
        var followedGroupIds = await groupFollows.GetFollowedGroupIdsAsync(userId);
        List<Note> groupHorizon = followedGroupIds.Count == 0
            ? []
            : await notes.GetRecentForMusicItemsAsync(followedGroupIds, excludedAuthors, HorizonLimit);

        var generalHorizon = await notes.GetRecentExcludingAuthorsAsync(
            excludedAuthors, HorizonLimit);

        // Lo que ya guardaste no necesita volver a encontrarte: fuera del
        // feed, que el hueco lo ocupe algo por descubrir
        var savedItemIds = (await discoveries.GetSavedItemIdsAsync(userId)).ToHashSet();
        circleNotes = circleNotes.Where(n => !savedItemIds.Contains(n.MusicItemId)).ToList();

        var anchoredIds = anchoredHorizon.Select(n => n.Id).ToHashSet();
        var targeted = anchoredHorizon
            .Concat(localHorizon.Where(n => !anchoredIds.Contains(n.Id)))
            .Concat(groupHorizon.Where(n => !anchoredIds.Contains(n.Id)))
            .DistinctBy(n => n.Id)
            .ToList();
        var targetedIds = targeted.Select(n => n.Id).ToHashSet();
        var horizon = targeted
            .Select(n => new HorizonCandidate(n, MatchesTaste: true))
            .Concat(generalHorizon
                .Where(n => !targetedIds.Contains(n.Id))
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

        var followedGroupIdSet = followedGroupIds.ToHashSet();

        // La explicación de la tarjeta: el ancla que coincide con tus tops
        // manda; luego el grupo que sigues; si no, la cercanía ("de tu provincia")
        return ranked
            .Select(n => new FeedNote(
                n,
                BecauseArtist: n.AnchorArtistSpotifyId is not null
                    && myTopArtistIds.Contains(n.AnchorArtistSpotifyId)
                    ? n.AnchorArtistName
                    : null,
                BecauseFollowedGroup: followedGroupIdSet.Contains(n.MusicItemId)
                    ? n.MusicItem.Name
                    : null,
                BecauseProvince: n.MusicItem.Type == MusicItemType.LocalGroup
                    && myProvince is not null
                    && n.MusicItem.Province == myProvince
                    ? myProvince
                    : null))
            .ToList();
    }

    // La estantería del feed: de qué habla tu gente esta semana (6 carátulas,
    // sin cifras) y qué se acaba de anotar en toda la app (la tira)
    public async Task<ShelfData> GetShelfAsync(Guid userId)
    {
        var following = await follows.GetFollowingUsersAsync(userId);
        var followingIds = following.Select(u => u.Id).ToList();

        var weekly = await notes.GetMostNotedItemsByAuthorsAsync(
            followingIds, DateTime.UtcNow.AddDays(-7), 6);
        var recent = await notes.GetRecentlyNotedItemsAsync(12);

        return new ShelfData(weekly, recent);
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
                user.SpotifyId.StartsWith("demo-") || user.SpotifyId.StartsWith("guest-")
                    ? null
                    : await GetNowPlayingSafeAsync(user.Id)));
        }

        // Primero quienes están escuchando algo ahora mismo
        return feed.OrderByDescending(i => i.NowPlaying is not null).ToList();
    }

    // El feed no puede caerse porque falle un solo usuario (token revocado,
    // Spotify caído...): ese usuario aparece como "no está escuchando nada".
    public static NowPlayingInfo ToInfo(SpotifyNowPlayingDto nowPlaying) => new(
        nowPlaying.Item!.Name,
        string.Join(", ", nowPlaying.Item.Artists.Select(a => a.Name)),
        nowPlaying.Item.Id,
        nowPlaying.Item.Album?.Images?.FirstOrDefault()?.Url,
        nowPlaying.ProgressMs,
        nowPlaying.Item.DurationMs);

    private async Task<NowPlayingInfo?> GetNowPlayingSafeAsync(Guid userId)
    {
        try
        {
            var nowPlaying = await spotify.GetNowPlayingAsync(userId);
            if (nowPlaying?.Item is null || !nowPlaying.IsPlaying) return null;

            return ToInfo(nowPlaying);
        }
        catch
        {
            return null;
        }
    }
}

// Una nota del feed con su explicación opcional: el artista ancla que la
// trajo hasta este lector, el grupo local que sigue, o la provincia si es
// un grupo de su zona (todos null si llegó por círculo u horizonte normal)
public record FeedNote(Note Note, string? BecauseArtist, string? BecauseFollowedGroup, string? BecauseProvince);

// Los dos estantes sobre el feed: lo más comentado del círculo esta semana
// y lo último anotado por cualquiera
public record ShelfData(List<MusicItem> Weekly, List<MusicItem> Recent);

public record FeedItem(Guid UserId, string DisplayName, string? AvatarUrl, NowPlayingInfo? NowPlaying);

// Lo que suena ahora, con lo necesario para pintar el "en directo": carátula,
// progreso y duración (el cliente hace avanzar la barra entre refrescos)
public record NowPlayingInfo(
    string Track, string Artist, string? SpotifyId = null, string? ImageUrl = null,
    int? ProgressMs = null, int? DurationMs = null);
