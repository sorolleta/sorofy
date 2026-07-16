using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SameSpot.Api.Config;
using SameSpot.Api.Extensions;
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
    IGroupFollowRepository groupFollows,
    IGroupPhotoRepository photos,
    IGroupVideoRepository videos,
    MediaLinkService media,
    IWebHostEnvironment env) : ControllerBase
{
    // Tipos de imagen aceptados y su límite de tamaño (fotos de móvil, no archivos cualquiera)
    private static readonly Dictionary<string, string> AllowedImageTypes = new()
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
    };
    private const long MaxPhotoBytes = 8 * 1024 * 1024;
    private const int MaxExtraVideos = 10;

    public record CreateLocalGroupRequest(
        string? Name, string? Description, string? YoutubeUrl, string? SoundcloudUrl,
        string? Category, string? Province, string? Repertoire, List<string>? ExtraYoutubeUrls);

    // Los catálogos del formulario de crear grupo
    [HttpGet("options")]
    public IActionResult GetOptions() => Ok(new
    {
        Categories = LocalGroupCategories.All,
        Provinces = SpainProvinces.All,
    });

    [HttpPost]
    public async Task<IActionResult> Create(CreateLocalGroupRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Falta el nombre del grupo." });
        }
        // Qué son y de dónde son, obligatorios: la proximidad local del
        // feed depende de la provincia
        if (request.Category is null || !LocalGroupCategories.IsValid(request.Category))
        {
            return BadRequest(new { message = "Elige una categoría de la lista." });
        }
        if (request.Province is null || !SpainProvinces.IsValid(request.Province))
        {
            return BadRequest(new { message = "Elige una provincia de la lista." });
        }
        var extraUrls = (request.ExtraYoutubeUrls ?? [])
            .Where(u => !string.IsNullOrWhiteSpace(u))
            .ToList();
        if (extraUrls.Count > MaxExtraVideos)
        {
            return BadRequest(new { message = $"Como mucho {MaxExtraVideos} vídeos adicionales." });
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

        // Los vídeos extra se validan igual que el principal, uno a uno
        var extraVideos = new List<(string Url, string? ThumbnailUrl)>();
        foreach (var url in extraUrls)
        {
            if (!MediaLinkService.IsYoutubeUrl(url))
            {
                return BadRequest(new { message = $"«{url}» no es un enlace de YouTube." });
            }
            var info = await media.ResolveYoutubeAsync(url);
            if (info is null)
            {
                return BadRequest(new { message = $"El vídeo «{url}» no existe o no es público." });
            }
            extraVideos.Add((info.Url, info.ThumbnailUrl));
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
            Category = request.Category,
            Province = request.Province,
            Repertoire = string.IsNullOrWhiteSpace(request.Repertoire) ? null : request.Repertoire.Trim(),
            CreatedByUserId = User.GetUserId(),
            CreatedAt = DateTime.UtcNow,
        };
        await items.AddAsync(item);
        await items.SaveChangesAsync();

        foreach (var (url, thumb) in extraVideos)
        {
            await videos.AddAsync(new GroupVideo
            {
                Id = Guid.NewGuid(),
                MusicItemId = item.Id,
                Url = url,
                ThumbnailUrl = thumb,
                CreatedAt = DateTime.UtcNow,
            });
        }
        if (extraVideos.Count > 0) await videos.SaveChangesAsync();

        return CreatedAtAction(nameof(Search), null, ToResponse(item));
    }

    // Antes de crear un grupo conviene buscar si ya existe (aunque crear un
    // duplicado no es un error). Con province en vez de query devuelve los
    // grupos de esa provincia: el "Cerca de ti" del onboarding.
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string? query, [FromQuery] string? province)
    {
        if (!string.IsNullOrWhiteSpace(province))
        {
            var nearby = await items.GetLocalGroupsByProvinceAsync(province.Trim(), 5);
            return Ok(nearby.Select(ToResponse));
        }
        if (string.IsNullOrWhiteSpace(query))
        {
            return BadRequest(new { message = "Falta el texto de búsqueda (query)." });
        }

        var groups = await items.SearchLocalGroupsAsync(query.Trim());
        return Ok(groups.Select(ToResponse));
    }

    // Seguir un grupo local: sus notas entran en tu círculo del feed aunque
    // no sigas a quien las escribió (idempotente, como el follow de usuarios)
    [HttpPost("{id:guid}/follow")]
    public async Task<IActionResult> Follow(Guid id)
    {
        var item = await items.GetByIdAsync(id);
        if (item is null || item.Type != MusicItemType.LocalGroup) return NotFound();

        var myId = User.GetUserId();
        if (!await groupFollows.ExistsAsync(myId, id))
        {
            await groupFollows.AddAsync(new GroupFollow { UserId = myId, MusicItemId = id });
            await groupFollows.SaveChangesAsync();
        }
        return NoContent();
    }

    [HttpDelete("{id:guid}/follow")]
    public async Task<IActionResult> Unfollow(Guid id)
    {
        await groupFollows.RemoveAsync(User.GetUserId(), id);
        await groupFollows.SaveChangesAsync();
        return NoContent();
    }

    // Una foto real del grupo (directo, ensayo...). Se guarda en disco:
    // es un proyecto de portfolio, no hace falta un proveedor externo.
    [HttpPost("{id:guid}/photos")]
    [RequestSizeLimit(MaxPhotoBytes)]
    public async Task<IActionResult> AddPhoto(Guid id, IFormFile? file)
    {
        var item = await items.GetByIdAsync(id);
        if (item is null || item.Type != MusicItemType.LocalGroup) return NotFound();

        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "Falta la foto." });
        }
        if (file.Length > MaxPhotoBytes)
        {
            return BadRequest(new { message = "La foto pesa demasiado (máximo 8 MB)." });
        }
        if (!AllowedImageTypes.TryGetValue(file.ContentType, out var extension))
        {
            return BadRequest(new { message = "Solo se aceptan fotos JPEG, PNG o WebP." });
        }

        var folder = Path.Combine(env.WebRootPath, "uploads", "local-groups", id.ToString());
        Directory.CreateDirectory(folder);
        var fileName = $"{Guid.NewGuid()}{extension}";
        await using (var stream = System.IO.File.Create(Path.Combine(folder, fileName)))
        {
            await file.CopyToAsync(stream);
        }

        var photo = new GroupPhoto
        {
            Id = Guid.NewGuid(),
            MusicItemId = id,
            Url = $"/uploads/local-groups/{id}/{fileName}",
            UploadedByUserId = User.GetUserId(),
            CreatedAt = DateTime.UtcNow,
        };
        await photos.AddAsync(photo);
        await photos.SaveChangesAsync();

        return Ok(new { photo.Id, photo.Url });
    }

    // Solo quien la subió (o quien dio de alta el grupo) puede quitarla
    [HttpDelete("photos/{photoId:guid}")]
    public async Task<IActionResult> RemovePhoto(Guid photoId)
    {
        var photo = await photos.GetByIdAsync(photoId);
        if (photo is null) return NotFound();

        var myId = User.GetUserId();
        var group = await items.GetByIdAsync(photo.MusicItemId);
        if (photo.UploadedByUserId != myId && group?.CreatedByUserId != myId)
        {
            return Forbid();
        }

        photos.Remove(photo);
        await photos.SaveChangesAsync();

        var path = Path.Combine(env.WebRootPath, photo.Url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        if (System.IO.File.Exists(path)) System.IO.File.Delete(path);

        return NoContent();
    }

    private static object ToResponse(MusicItem item) => new
    {
        item.Id,
        item.Name,
        item.Description,
        item.ImageUrl,
        item.YoutubeUrl,
        item.SoundcloudUrl,
        item.Category,
        item.Province,
        Repertoire = SplitRepertoire(item.Repertoire),
        item.CreatedAt,
    };

    internal static List<string> SplitRepertoire(string? repertoire) =>
        repertoire?.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).ToList() ?? [];
}
