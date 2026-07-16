using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SameSpot.Api.Extensions;
using SameSpot.Api.Services;

namespace SameSpot.Api.Controllers;

// El rastro de lo que tus notas han movido: sin cifras, sin "a X personas
// les gusta". Solo el eco de tu círculo.
[ApiController]
[Authorize]
[Route("api/ecos")]
public class EcosController(EcosService ecos) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetEcos()
    {
        var items = await ecos.GetEcosAsync(User.GetUserId());
        return Ok(items.Select(e => new
        {
            e.Id,
            e.Kind,
            e.CreatedAt,
            e.HasUnread,
            Actor = new { Id = e.ActorId, Name = e.ActorName, AvatarUrl = e.ActorAvatarUrl },
            e.NoteId,
            e.MusicItemId,
            e.MusicItemName,
            e.MusicItemImageUrl,
            e.Quote,
            e.ListaId,
            e.ListaTitle,
            e.CommonArtist,
        }));
    }

    [HttpGet("has-unread")]
    public async Task<IActionResult> HasUnread() =>
        Ok(new { HasUnread = await ecos.HasUnreadAsync(User.GetUserId()) });

    // Abrir la pantalla es leerla: limpia el punto de la campana
    [HttpPost("read")]
    public async Task<IActionResult> MarkRead()
    {
        await ecos.MarkReadAsync(User.GetUserId());
        return NoContent();
    }
}
