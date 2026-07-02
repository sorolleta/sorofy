using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SameSpot.Api.Extensions;
using SameSpot.Api.Services;

namespace SameSpot.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/search")]
public class SearchController(SpotifyApiService spotify) : ControllerBase
{
    // Busca álbumes y canciones en Spotify (para elegir qué reseñar)
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string? q)
    {
        if (string.IsNullOrWhiteSpace(q))
        {
            return BadRequest(new { message = "Falta el texto de búsqueda (q)." });
        }

        var result = await spotify.SearchAsync(User.GetUserId(), q.Trim());

        return Ok(new
        {
            Albums = (result?.Albums?.Items ?? []).Select(a => new
            {
                a.Id,
                a.Name,
                ArtistName = string.Join(", ", a.Artists.Select(x => x.Name)),
                ImageUrl = a.Images?.FirstOrDefault()?.Url,
            }),
            Tracks = (result?.Tracks?.Items ?? []).Select(t => new
            {
                t.Id,
                t.Name,
                ArtistName = string.Join(", ", t.Artists.Select(x => x.Name)),
                ImageUrl = t.Album?.Images?.FirstOrDefault()?.Url,
            }),
        });
    }
}
