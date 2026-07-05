using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SameSpot.Api.Repositories;

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
    INoteRepository notes) : ControllerBase
{
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetDetail(Guid id)
    {
        var item = await items.GetByIdAsync(id);
        if (item is null) return NotFound();

        var itemNotes = await notes.GetByItemAsync(id);
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
            },
            Notes = itemNotes.Select(n => new
            {
                Author = new { n.User.Id, n.User.DisplayName, n.User.AvatarUrl },
                Note = NotesController.ToResponse(n),
            }),
        });
    }
}
