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
    SpotifyApiService spotify,
    MusicItemResolverService resolver,
    MediaLinkService media) : ControllerBase
{
    // Una nota con texto tiene que contar algo: el mínimo evita el "ok" suelto
    private const int MinTextLength = 20;
    private const string MinTextMessage =
        "Cuéntanos un poco más: una nota necesita al menos 20 caracteres.";

    // El item se indica de una de estas dos formas:
    // - itemType (track/album/artist) + spotifyItemId, para cosas de Spotify
    // - musicItemId, para grupos locales ya creados en /api/local-groups
    public record CreateNoteRequest(
        string? ItemType, string? SpotifyItemId, Guid? MusicItemId,
        string? Text, string? VibeColor, string? VibeEmoji, string? VibeLabel,
        string? AnchorArtistId, string? ListenUrl);

    public record UpdateNoteRequest(
        string? Text, string? VibeColor, string? VibeEmoji, string? VibeLabel,
        string? AnchorArtistId, string? ListenUrl);

    [HttpPost]
    public async Task<IActionResult> Create(CreateNoteRequest request)
    {
        var text = NormalizeText(request.Text);
        var vibeLabel = NormalizeText(request.VibeLabel);
        if (text is null && vibeLabel is null)
        {
            return BadRequest(new { message = "Una nota necesita al menos texto o un vibe." });
        }
        if (text is not null && text.Length < MinTextLength)
        {
            return BadRequest(new { message = MinTextMessage });
        }

        var myId = User.GetUserId();

        var anchor = await ResolveAnchorAsync(myId, request.AnchorArtistId);
        if (anchor.Error is not null) return anchor.Error;

        var listen = await ResolveListenUrlAsync(request.ListenUrl);
        if (listen.Error is not null) return listen.Error;

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
            ListenUrl = listen.Url,
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

    // Sugerencias para el picker de vibe: etiquetas que ya usó la
    // comunidad, en vez de un campo 100% libre
    [HttpGet("vibe-labels")]
    public async Task<IActionResult> GetVibeLabels() => Ok(await notes.GetRecentVibeLabelsAsync(20));

    // La página de detalle de una nota: la nota y quién la escribió
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetDetail(Guid id)
    {
        var note = await notes.GetByIdWithAuthorAsync(id);
        if (note is null) return NotFound();

        return Ok(new
        {
            Author = new { note.User.Id, note.User.DisplayName, note.User.AvatarUrl },
            Note = ToResponse(note),
        });
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
        if (text is not null && text.Length < MinTextLength)
        {
            return BadRequest(new { message = MinTextMessage });
        }

        var note = await notes.GetByIdAsync(id);
        if (note is null || note.UserId != User.GetUserId()) return NotFound();

        var anchor = await ResolveAnchorAsync(note.UserId, request.AnchorArtistId);
        if (anchor.Error is not null) return anchor.Error;

        var listen = await ResolveListenUrlAsync(request.ListenUrl);
        if (listen.Error is not null) return listen.Error;

        note.Text = text;
        note.VibeColor = NormalizeText(request.VibeColor);
        note.VibeEmoji = NormalizeText(request.VibeEmoji);
        note.VibeLabel = vibeLabel;
        note.ListenUrl = listen.Url;
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
    // lo crea validándolo contra Spotify (lógica compartida en el resolver)
    private async Task<(MusicItem? Item, IActionResult? Error)> FindOrCreateSpotifyItemAsync(
        Guid myId, string? rawType, string? rawSpotifyId)
    {
        var itemType = MusicItemResolverService.ParseSpotifyItemType(rawType);
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

        var result = await resolver.FindOrCreateAsync(myId, itemType.Value, rawSpotifyId);
        if (result.Error is not null) return (null, NotFound(new { message = result.Error }));
        return (result.Item, null);
    }

    // El "escúchalo aquí" solo puede ser de YouTube o SoundCloud, y el
    // contenido tiene que existir (mismo oEmbed que los grupos locales)
    private async Task<(string? Url, IActionResult? Error)> ResolveListenUrlAsync(string? rawUrl)
    {
        var url = NormalizeText(rawUrl);
        if (url is null) return (null, null);

        if (MediaLinkService.IsYoutubeUrl(url))
        {
            var info = await media.ResolveYoutubeAsync(url);
            if (info is null)
            {
                return (null, NotFound(new { message = "Ese vídeo de YouTube no existe o no es público." }));
            }
            return (info.Url, null);
        }
        if (MediaLinkService.IsSoundcloudUrl(url))
        {
            var info = await media.ResolveSoundcloudAsync(url);
            if (info is null)
            {
                return (null, NotFound(new { message = "Ese audio de SoundCloud no existe o no es público." }));
            }
            return (info.Url, null);
        }
        return (null, BadRequest(new { message = "El enlace de escucha debe ser de YouTube o SoundCloud." }));
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

    private static string? NormalizeText(string? text) =>
        string.IsNullOrWhiteSpace(text) ? null : text.Trim();

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
            n.MusicItem.YoutubeUrl,
            n.MusicItem.SoundcloudUrl,
            n.MusicItem.Category,
            n.MusicItem.Province,
        },
        n.Text,
        n.VibeColor,
        n.VibeEmoji,
        n.VibeLabel,
        n.ListenUrl,
        n.AnchorArtistSpotifyId,
        n.AnchorArtistName,
        n.CreatedAt,
        n.UpdatedAt,
    };
}
