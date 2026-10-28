using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SameSpot.Api.Extensions;
using SameSpot.Api.Models;
using SameSpot.Api.Repositories;
using SameSpot.Api.Services;

namespace SameSpot.Api.Controllers;

// La ficha de un item musical (álbum, canción, artista o grupo local):
// sus datos y todas las notas que la comunidad ha escrito sobre él.
// Sin nota media ni rankings a propósito: contexto humano en orden
// cronológico, no agregados.
[ApiController]
[Authorize]
[Route("api/music-items")]
public class MusicItemsController(
    IMusicItemRepository items,
    INoteRepository notes,
    IGroupFollowRepository groupFollows,
    IFollowRepository follows,
    IDiscoveryRepository discoveries,
    IGroupPhotoRepository photos,
    IGroupVideoRepository videos,
    SpotifyApiService spotify,
    MusicItemResolverService resolver) : ControllerBase
{
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetDetail(Guid id)
    {
        var item = await items.GetByIdAsync(id);
        if (item is null) return NotFound();

        var myId = User.GetUserId();
        var itemNotes = await notes.GetByItemAsync(id);
        var isFollowedByMe = item.Type == MusicItemType.LocalGroup
            && await groupFollows.ExistsAsync(myId, id);
        var itemPhotos = item.Type == MusicItemType.LocalGroup
            ? await photos.GetByItemAsync(id)
            : [];
        var itemVideos = item.Type == MusicItemType.LocalGroup
            ? await videos.GetByItemAsync(id)
            : [];

        return Ok(new
        {
            Item = new
            {
                item.Id,
                Type = NotesController.TypeToString(item.Type),
                item.SpotifyId,
                item.Name,
                item.ArtistName,
                item.ImageUrl,
                item.Description,
                item.YoutubeUrl,
                item.SoundcloudUrl,
                item.Category,
                item.Province,
                item.CreatedByUserId,
                IsFollowedByMe = isFollowedByMe,
                Repertoire = LocalGroupsController.SplitRepertoire(item.Repertoire),
                Photos = itemPhotos.Select(p => new
                {
                    p.Id,
                    p.Url,
                    UploadedByUserId = p.UploadedByUserId,
                    CanRemove = p.UploadedByUserId == myId || item.CreatedByUserId == myId,
                }),
                ExtraVideos = itemVideos.Select(v => new { v.Id, v.Url, v.ThumbnailUrl }),
            },
            Notes = itemNotes.Select(n => new
            {
                Author = new { n.User.Id, n.User.DisplayName, n.User.AvatarUrl },
                Note = NotesController.ToResponse(n),
            }),
            // El contexto que viste la ficha sale de Spotify en vivo; si la
            // llamada falla, la ficha se muestra igual sin él
            Extra = await GetSpotifyExtraAsync(item),
            Circle = await GetCircleAsync(myId, id, itemNotes),
        });
    }

    // "En tu círculo": quién de tu gente (a quien sigues) ya lo tiene
    // guardado o ha escrito sobre esto — sin cifras públicas de nadie más
    private async Task<object> GetCircleAsync(Guid myId, Guid itemId, List<Note> itemNotes)
    {
        var followingIds = (await follows.GetFollowingUsersAsync(myId)).Select(u => u.Id).ToHashSet();
        if (followingIds.Count == 0) return Array.Empty<object>();

        var saved = (await discoveries.GetByItemAsync(itemId))
            .Where(d => followingIds.Contains(d.UserId))
            .Select(d => new
            {
                Kind = "saved",
                UserId = d.User.Id,
                d.User.DisplayName,
                d.SavedAt,
                NoteCount = (int?)null,
            });

        var noted = itemNotes
            .Where(n => followingIds.Contains(n.UserId))
            .GroupBy(n => n.User)
            .Select(g => new
            {
                Kind = "noted",
                UserId = g.Key.Id,
                g.Key.DisplayName,
                SavedAt = (DateTime?)null,
                NoteCount = (int?)g.Count(),
            });

        return saved.Cast<object>().Concat(noted.Cast<object>());
    }

    // Navegación entre fichas ("del álbum", discos del artista, podio):
    // de un id de Spotify a nuestro MusicItem, creándolo si nadie lo trajo
    [HttpGet("resolve")]
    public async Task<IActionResult> Resolve(string? type, string? spotifyId)
    {
        var itemType = MusicItemResolverService.ParseSpotifyItemType(type);
        if (itemType is null || string.IsNullOrWhiteSpace(spotifyId))
        {
            return BadRequest(new { message = "Hacen falta type (track/album/artist) y spotifyId." });
        }

        var result = await resolver.FindOrCreateAsync(User.GetUserId(), itemType.Value, spotifyId);
        if (result.Error is not null) return NotFound(new { message = result.Error });
        return Ok(new { result.Item!.Id });
    }

    private async Task<object?> GetSpotifyExtraAsync(MusicItem item)
    {
        if (item.SpotifyId is null) return null;
        var myId = User.GetUserId();

        try
        {
            switch (item.Type)
            {
                case MusicItemType.Album:
                {
                    var album = await spotify.GetAlbumAsync(myId, item.SpotifyId);
                    if (album?.Tracks is null) return null;

                    // Las frases en cursiva del tracklist: la última nota
                    // con texto que alguien dejó sobre cada canción
                    var hints = await notes.GetLatestForTrackSpotifyIdsAsync(
                        album.Tracks.Items.Select(t => t.Id).ToList());

                    // "Más de X": otros discos del artista principal, sin este
                    var mainArtist = album.Artists.FirstOrDefault();
                    var moreAlbums = mainArtist?.Id is null
                        ? []
                        : (await spotify.GetArtistAlbumsAsync(myId, mainArtist.Id, 6))
                            .Where(a => a.Id != item.SpotifyId && a.Name != album.Name)
                            .Take(3)
                            .ToList();

                    return new
                    {
                        ReleaseYear = ReleaseYearOf(album.ReleaseDate),
                        album.TotalTracks,
                        TotalDurationMin = album.Tracks.Items.Sum(t => t.DurationMs) / 60000,
                        Tracks = album.Tracks.Items.Select(t => new
                        {
                            Number = t.TrackNumber,
                            t.Name,
                            t.DurationMs,
                            SpotifyId = t.Id,
                            NoteHint = hints
                                .Where(n => n.MusicItem.SpotifyId == t.Id)
                                .Select(n => new
                                {
                                    NoteId = n.Id,
                                    n.Text,
                                    AuthorName = n.User.DisplayName,
                                })
                                .FirstOrDefault(),
                        }),
                        MoreFromArtist = moreAlbums.Count == 0 ? null : new
                        {
                            ArtistName = mainArtist!.Name,
                            Albums = moreAlbums.Select(a => new
                            {
                                SpotifyId = a.Id,
                                a.Name,
                                ImageUrl = a.Images?.FirstOrDefault()?.Url,
                            }),
                        },
                    };
                }
                case MusicItemType.Track:
                {
                    var track = await spotify.GetTrackAsync(myId, item.SpotifyId);
                    if (track is null) return null;
                    return new
                    {
                        track.DurationMs,
                        Album = track.Album is null ? null : new
                        {
                            SpotifyId = track.Album.Id,
                            track.Album.Name,
                            ImageUrl = track.Album.Images?.FirstOrDefault()?.Url,
                            ReleaseYear = ReleaseYearOf(track.Album.ReleaseDate),
                        },
                    };
                }
                case MusicItemType.Artist:
                {
                    var albums = await spotify.GetArtistAlbumsAsync(myId, item.SpotifyId, 6);
                    if (albums.Count == 0) return null;
                    return new
                    {
                        Albums = albums.Select(a => new
                        {
                            SpotifyId = a.Id,
                            a.Name,
                            ImageUrl = a.Images?.FirstOrDefault()?.Url,
                        }),
                    };
                }
                default:
                    return null;
            }
        }
        catch (HttpRequestException)
        {
            // Sin token válido o Spotify caído: la ficha vive sin extras
            return null;
        }
    }

    // "2021-05-13", "2021-05" o "2021" → "2021"
    private static string? ReleaseYearOf(string? releaseDate) =>
        releaseDate?.Split('-').FirstOrDefault();
}
