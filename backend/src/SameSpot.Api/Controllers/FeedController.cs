using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SameSpot.Api.Extensions;
using SameSpot.Api.Services;

namespace SameSpot.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/feed")]
public class FeedController(FeedService feedService) : ControllerBase
{
    // El feed de descubrimiento: tarjetas de notas rankeadas por el
    // algoritmo invisible (afinidad + frescura + 20% de horizonte)
    [HttpGet]
    public async Task<IActionResult> GetNotesFeed()
    {
        var feed = await feedService.GetNotesFeedAsync(User.GetUserId());
        return Ok(feed.Select(f => new
        {
            Author = new { f.Note.User.Id, f.Note.User.DisplayName, f.Note.User.AvatarUrl },
            Note = NotesController.ToResponse(f.Note),
            f.BecauseArtist,
        }));
    }

    // Qué están escuchando ahora mismo los usuarios que sigo
    [HttpGet("now-playing")]
    public async Task<IActionResult> GetNowPlaying() =>
        Ok(await feedService.GetNowPlayingFeedAsync(User.GetUserId()));
}
