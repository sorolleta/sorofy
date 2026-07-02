using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SameSpot.Api.Models;
using SameSpot.Api.Repositories;

namespace SameSpot.Api.Controllers;

// Grupos locales (charangas, bandas de pueblo...) que no existen en Spotify:
// los crea cualquier usuario. Sin moderación en el MVP; si aparece un
// duplicado, no pasa nada.
[ApiController]
[Authorize]
[Route("api/local-groups")]
public class LocalGroupsController(IMusicItemRepository items) : ControllerBase
{
    public record CreateLocalGroupRequest(string? Name, string? Description);

    [HttpPost]
    public async Task<IActionResult> Create(CreateLocalGroupRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Falta el nombre del grupo." });
        }

        var item = new MusicItem
        {
            Id = Guid.NewGuid(),
            Type = MusicItemType.LocalGroup,
            Name = request.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description)
                ? null
                : request.Description.Trim(),
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
        item.CreatedAt,
    };
}
