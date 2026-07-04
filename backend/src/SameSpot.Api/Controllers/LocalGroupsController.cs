using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SameSpot.Api.Models;
using SameSpot.Api.Repositories;
using SameSpot.Api.Services;

namespace SameSpot.Api.Controllers;

// Grupos locales (charangas, bandas de pueblo...) que no existen en Spotify:
// los crea cualquier usuario. Sin moderación en el MVP; si aparece un
// duplicado, no pasa nada.
[ApiController]
[Authorize]
[Route("api/local-groups")]
public class LocalGroupsController(
    IMusicItemRepository items,
    MediaLinkService media) : ControllerBase
{
    public record CreateLocalGroupRequest(
        string? Name, string? Description, string? YoutubeUrl, string? SoundcloudUrl);

    [HttpPost]
    public async Task<IActionResult> Create(CreateLocalGroupRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Falta el nombre del grupo." });
        }

        // Los enlaces son opcionales, pero si vienen tienen que ser de su
        // plataforma y existir de verdad (el oEmbed nos da la miniatura)
        string? youtubeUrl = null, soundcloudUrl = null, thumbnailUrl = null;
        if (!string.IsNullOrWhiteSpace(request.YoutubeUrl))
        {
            if (!MediaLinkService.IsYoutubeUrl(request.YoutubeUrl))
            {
                return BadRequest(new { message = "Ese enlace no es de YouTube." });
            }
            var info = await media.ResolveYoutubeAsync(request.YoutubeUrl);
            if (info is null)
            {
                return BadRequest(new { message = "Ese vídeo de YouTube no existe o no es público." });
            }
            (youtubeUrl, thumbnailUrl) = (info.Url, info.ThumbnailUrl);
        }
        if (!string.IsNullOrWhiteSpace(request.SoundcloudUrl))
        {
            if (!MediaLinkService.IsSoundcloudUrl(request.SoundcloudUrl))
            {
                return BadRequest(new { message = "Ese enlace no es de SoundCloud." });
            }
            var info = await media.ResolveSoundcloudAsync(request.SoundcloudUrl);
            if (info is null)
            {
                return BadRequest(new { message = "Ese audio de SoundCloud no existe o no es público." });
            }
            soundcloudUrl = info.Url;
            thumbnailUrl ??= info.ThumbnailUrl;
        }

        var item = new MusicItem
        {
            Id = Guid.NewGuid(),
            Type = MusicItemType.LocalGroup,
            Name = request.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description)
                ? null
                : request.Description.Trim(),
            YoutubeUrl = youtubeUrl,
            SoundcloudUrl = soundcloudUrl,
            ImageUrl = thumbnailUrl,
            CreatedAt = DateTime.UtcNow,
        };
        await items.AddAsync(item);
        await items.SaveChangesAsync();

        return CreatedAtAction(nameof(Search), null, ToResponse(item));
    }

    // Antes de crear un grupo conviene buscar si ya existe (aunque crear un
    // duplicado no es un error)
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string? query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return BadRequest(new { message = "Falta el texto de búsqueda (query)." });
        }

        var groups = await items.SearchLocalGroupsAsync(query.Trim());
        return Ok(groups.Select(ToResponse));
    }

    private static object ToResponse(MusicItem item) => new
    {
        item.Id,
        item.Name,
        item.Description,
        item.ImageUrl,
        item.YoutubeUrl,
        item.SoundcloudUrl,
        item.CreatedAt,
    };
}
