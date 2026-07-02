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
    // Qué están escuchando ahora mismo los usuarios que sigo
    [HttpGet]
    public async Task<IActionResult> GetFeed() =>
        Ok(await feedService.GetFeedAsync(User.GetUserId()));
}
