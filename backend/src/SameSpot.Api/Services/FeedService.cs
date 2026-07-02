using SameSpot.Api.Models;
using SameSpot.Api.Repositories;

namespace SameSpot.Api.Services;

// Construye el feed: qué están escuchando ahora los usuarios que sigo.
public class FeedService(IFollowRepository follows, SpotifyApiService spotify)
{
    public async Task<List<FeedItem>> GetFeedAsync(Guid userId)
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
