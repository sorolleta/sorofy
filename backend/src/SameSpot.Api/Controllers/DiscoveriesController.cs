using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SameSpot.Api.Extensions;
using SameSpot.Api.Repositories;
using SameSpot.Api.Services;

namespace SameSpot.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/discoveries")]
public class DiscoveriesController(
    DiscoveryService discoveryService,
    IDiscoveryRepository discoveries) : ControllerBase
{
    public record SaveRequest(Guid NoteId);

    // Guardar la canción de una nota del feed en mi playlist de Spotify
    [HttpPost]
    public async Task<IActionResult> Save(SaveRequest request)
    {
        var result = await discoveryService.SaveAsync(User.GetUserId(), request.NoteId);
        if (result.Error is not null)
        {
            return result.Error.Contains("no existe")
                ? NotFound(new { message = result.Error })
                : BadRequest(new { message = result.Error });
        }

        var d = result.Discovery!;
        return Ok(new { d.Id, d.MusicItemId, d.AuthorId, d.SavedAt });
    }

    // Los items que ya guardé, para marcarlos en el feed
    [HttpGet("mine")]
    public async Task<IActionResult> GetMine() =>
        Ok(await discoveries.GetSavedItemIdsAsync(User.GetUserId()));
}
