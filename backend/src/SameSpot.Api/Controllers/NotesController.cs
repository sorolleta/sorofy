using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SameSpot.Api.Extensions;
using SameSpot.Api.Models;
using SameSpot.Api.Repositories;
using SameSpot.Api.Services;

namespace SameSpot.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/notes")]
public class NotesController(
    INoteRepository notes,
    IMusicItemRepository items,
    SpotifyApiService spotify) : ControllerBase
{
    // El item se indica de una de estas dos formas:
    // - itemType (track/album/artist) + spotifyItemId, para cosas de Spotify
    // - musicItemId, para grupos locales ya creados en /api/local-groups
    public record CreateNoteRequest(
        string? ItemType, string? SpotifyItemId, Guid? MusicItemId,
        string? Text, string? VibeColor, string? VibeEmoji, string? VibeLabel,
        string? AnchorArtistId);

    public record UpdateNoteRequest(
        string? Text, string? VibeColor, string? VibeEmoji, string? VibeLabel,
        string? AnchorArtistId);

    [HttpPost]
    public async Task<IActionResult> Create(CreateNoteRequest request)
    {
        var text = NormalizeText(request.Text);
        var vibeLabel = NormalizeText(request.VibeLabel);
        if (text is null && vibeLabel is null)
        {
            return BadRequest(new { message = "Una nota necesita al menos texto o un vibe." });
        }

        var myId = User.GetUserId();

        var anchor = await ResolveAnchorAsync(myId, request.AnchorArtistId);
        if (anchor.Error is not null) return anchor.Error;

        MusicItem? item;
        if (request.MusicItemId is Guid musicItemId)
        {
            item = await items.GetByIdAsync(musicItemId);
            if (item is null) return NotFound(new { message = "Ese item no existe." });
        }
        else
        {
            var found = await FindOrCreateSpotifyItemAsync(myId, request.ItemType, request.SpotifyItemId);
            if (found.Error is not null) return found.Error;
            item = found.Item!;
        }

        var note = new Note
        {
            Id = Guid.NewGuid(),
            UserId = myId,
            MusicItemId = item.Id,
            MusicItem = item,
            Text = text,
            VibeColor = NormalizeText(request.VibeColor),
            VibeEmoji = NormalizeText(request.VibeEmoji),
            VibeLabel = vibeLabel,
            AnchorArtistSpotifyId = anchor.SpotifyId,
            AnchorArtistName = anchor.Name,
            CreatedAt = DateTime.UtcNow,
        };
        await notes.AddAsync(note);
        await notes.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMine), null, ToResponse(note));
    }

    [HttpGet("mine")]
    public async Task<IActionResult> GetMine()
    {
        var mine = await notes.GetByUserAsync(User.GetUserId());
        return Ok(mine.Select(ToResponse));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateNoteRequest request)
    {
        var text = NormalizeText(request.Text);
        var vibeLabel = NormalizeText(request.VibeLabel);
        if (text is null && vibeLabel is null)
        {
            return BadRequest(new { message = "Una nota necesita al menos texto o un vibe." });
        }

        var note = await notes.GetByIdAsync(id);
        if (note is null || note.UserId != User.GetUserId()) return NotFound();

        var anchor = await ResolveAnchorAsync(note.UserId, request.AnchorArtistId);
        if (anchor.Error is not null) return anchor.Error;

        note.Text = text;
        note.VibeColor = NormalizeText(request.VibeColor);
        note.VibeEmoji = NormalizeText(request.VibeEmoji);
        note.VibeLabel = vibeLabel;
        note.AnchorArtistSpotifyId = anchor.SpotifyId;
        note.AnchorArtistName = anchor.Name;
        note.UpdatedAt = DateTime.UtcNow;
        await notes.SaveChangesAsync();

        return Ok(ToResponse(note));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var note = await notes.GetByIdAsync(id);
        if (note is null || note.UserId != User.GetUserId()) return NotFound();

        notes.Remove(note);
        await notes.SaveChangesAsync();
        return NoContent();
    }

    // Busca el MusicItem en nuestra BD y, si es la primera nota sobre él,
    // lo crea validándolo contra Spotify (que además nos da los metadatos
    // canónicos: no nos fiamos de los del cliente).
    private async Task<(MusicItem? Item, IActionResult? Error)> FindOrCreateSpotifyItemAsync(
        Guid myId, string? rawType, string? rawSpotifyId)
    {
        var itemType = ParseSpotifyItemType(rawType);
        if (itemType is null)
        {
            return (null, BadRequest(new
            {
                message = "itemType debe ser \"track\", \"album\" o \"artist\" (para grupos locales usa musicItemId).",
            }));
        }
        if (string.IsNullOrWhiteSpace(rawSpotifyId))
        {
            return (null, BadRequest(new { message = "Falta spotifyItemId." }));
        }

        var spotifyId = rawSpotifyId.Trim();
        var existing = await items.GetBySpotifyIdAsync(itemType.Value, spotifyId);
        if (existing is not null) return (existing, null);

        string name;
        string? artistName, imageUrl;
        switch (itemType.Value)
        {
            case MusicItemType.Track:
                var track = await spotify.GetTrackAsync(myId, spotifyId);
                if (track is null) return (null, NotFound(new { message = "Esa canción no existe en Spotify." }));
                (name, artistName, imageUrl) =
                    (track.Name, JoinArtists(track.Artists), track.Album?.Images?.FirstOrDefault()?.Url);
                break;
            case MusicItemType.Album:
                var album = await spotify.GetAlbumAsync(myId, spotifyId);
                if (album is null) return (null, NotFound(new { message = "Ese álbum no existe en Spotify." }));
                (name, artistName, imageUrl) =
                    (album.Name, JoinArtists(album.Artists), album.Images?.FirstOrDefault()?.Url);
                break;
            default:
                var artist = await spotify.GetArtistAsync(myId, spotifyId);
                if (artist is null) return (null, NotFound(new { message = "Ese artista no existe en Spotify." }));
                (name, artistName, imageUrl) =
                    (artist.Name, null, artist.Images?.FirstOrDefault()?.Url);
                break;
        }

        var item = new MusicItem
        {
            Id = Guid.NewGuid(),
            Type = itemType.Value,
            SpotifyId = spotifyId,
            Name = name,
            ArtistName = artistName,
            ImageUrl = imageUrl,
            CreatedAt = DateTime.UtcNow,
        };
        await items.AddAsync(item);
        return (item, null);
    }

    // El ancla "si te gusta X" se valida contra Spotify y guardamos su
    // nombre canónico; ancla vacía = nota sin recomendación dirigida
    private async Task<(string? SpotifyId, string? Name, IActionResult? Error)> ResolveAnchorAsync(
        Guid userId, string? rawAnchorId)
    {
        var anchorId = NormalizeText(rawAnchorId);
        if (anchorId is null) return (null, null, null);

        var artist = await spotify.GetArtistAsync(userId, anchorId);
        if (artist is null)
        {
            return (null, null, NotFound(new { message = "Ese artista ancla no existe en Spotify." }));
        }
        return (anchorId, artist.Name, null);
    }

    private static MusicItemType? ParseSpotifyItemType(string? raw) => raw?.ToLowerInvariant() switch
    {
        "track" => MusicItemType.Track,
        "album" => MusicItemType.Album,
        "artist" => MusicItemType.Artist,
        _ => null,
    };

    private static string? NormalizeText(string? text) =>
        string.IsNullOrWhiteSpace(text) ? null : text.Trim();

    private static string JoinArtists(List<SpotifyArtistBriefDto> artists) =>
        string.Join(", ", artists.Select(a => a.Name));

    internal static string TypeToString(MusicItemType type) => type switch
    {
        MusicItemType.Album => "album",
        MusicItemType.Track => "track",
        MusicItemType.Artist => "artist",
        _ => "localGroup",
    };

    internal static object ToResponse(Note n) => new
    {
        n.Id,
        Item = new
        {
            n.MusicItem.Id,
            Type = TypeToString(n.MusicItem.Type),
            n.MusicItem.SpotifyId,
            n.MusicItem.Name,
            n.MusicItem.ArtistName,
            n.MusicItem.ImageUrl,
            n.MusicItem.Description,
        },
        n.Text,
        n.VibeColor,
        n.VibeEmoji,
        n.VibeLabel,
        n.AnchorArtistSpotifyId,
        n.AnchorArtistName,
        n.CreatedAt,
        n.UpdatedAt,
    };
}
