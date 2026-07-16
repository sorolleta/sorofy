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
            f.BecauseFollowedGroup,
            f.BecauseProvince,
        }));
    }

    // Qué están escuchando ahora mismo los usuarios que sigo
    [HttpGet("now-playing")]
    public async Task<IActionResult> GetNowPlaying() =>
        Ok(await feedService.GetNowPlayingFeedAsync(User.GetUserId()));

    // La estantería sobre el feed: carátulas, nunca cifras
    [HttpGet("shelf")]
    public async Task<IActionResult> GetShelf()
    {
        var shelf = await feedService.GetShelfAsync(User.GetUserId());
        return Ok(new
        {
            Weekly = shelf.Weekly.Select(ItemToResponse),
            Recent = shelf.Recent.Select(ItemToResponse),
        });
    }

    private static object ItemToResponse(Models.MusicItem item) => new
    {
        item.Id,
        Type = NotesController.TypeToString(item.Type),
        item.Name,
        item.ArtistName,
        item.ImageUrl,
        item.Category,
        item.Province,
    };
}
