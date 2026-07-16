using SameSpot.Api.Models;
using SameSpot.Api.Repositories;

namespace SameSpot.Api.Services;

// Busca un item de Spotify en nuestra BD y, si nadie lo trajo antes, lo
// crea validándolo contra Spotify (que además da los metadatos canónicos:
// no nos fiamos de los del cliente). Lo usan las notas al crearse y la
// navegación entre fichas (del álbum, discos del artista, podio...).
public class MusicItemResolverService(IMusicItemRepository items, SpotifyApiService spotify)
{
    public record ResolveResult(MusicItem? Item, string? Error);

    public async Task<ResolveResult> FindOrCreateAsync(Guid userId, MusicItemType type, string rawSpotifyId)
    {
        var spotifyId = rawSpotifyId.Trim();
        var existing = await items.GetBySpotifyIdAsync(type, spotifyId);
        if (existing is not null) return new(existing, null);

        string name;
        string? artistName, imageUrl;
        switch (type)
        {
            case MusicItemType.Track:
                var track = await spotify.GetTrackAsync(userId, spotifyId);
                if (track is null) return new(null, "Esa canción no existe en Spotify.");
                (name, artistName, imageUrl) =
                    (track.Name, JoinArtists(track.Artists), track.Album?.Images?.FirstOrDefault()?.Url);
                break;
            case MusicItemType.Album:
                var album = await spotify.GetAlbumAsync(userId, spotifyId);
                if (album is null) return new(null, "Ese álbum no existe en Spotify.");
                (name, artistName, imageUrl) =
                    (album.Name, JoinArtists(album.Artists), album.Images?.FirstOrDefault()?.Url);
                break;
            case MusicItemType.Artist:
                var artist = await spotify.GetArtistAsync(userId, spotifyId);
                if (artist is null) return new(null, "Ese artista no existe en Spotify.");
                (name, artistName, imageUrl) = (artist.Name, null, artist.Images?.FirstOrDefault()?.Url);
                break;
            default:
                return new(null, "Los grupos locales no viven en Spotify.");
        }

        var item = new MusicItem
        {
            Id = Guid.NewGuid(),
            Type = type,
            SpotifyId = spotifyId,
            Name = name,
            ArtistName = artistName,
            ImageUrl = imageUrl,
            CreatedAt = DateTime.UtcNow,
        };
        await items.AddAsync(item);
        await items.SaveChangesAsync();
        return new(item, null);
    }

    public static MusicItemType? ParseSpotifyItemType(string? raw) => raw?.ToLowerInvariant() switch
    {
        "track" => MusicItemType.Track,
        "album" => MusicItemType.Album,
        "artist" => MusicItemType.Artist,
        _ => null,
    };

    private static string JoinArtists(List<SpotifyArtistBriefDto> artists) =>
        string.Join(", ", artists.Select(a => a.Name));
}
