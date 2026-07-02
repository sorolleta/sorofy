using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SameSpot.Api.Extensions;
using SameSpot.Api.Models;
using SameSpot.Api.Repositories;

namespace SameSpot.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/users")]
public class UsersController(
    IUserRepository users,
    IFollowRepository follows,
    ITopItemsRepository tops) : ControllerBase
{
    // Listado de usuarios para descubrir a quién seguir (en el MVP cabemos
    // 5 personas por app de Spotify, así que no hace falta paginar ni buscar)
    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        var myId = User.GetUserId();
        var result = new List<object>();
        foreach (var user in await users.GetAllExceptAsync(myId))
        {
            result.Add(new
            {
                user.Id,
                user.DisplayName,
                user.AvatarUrl,
                IsFollowedByMe = await follows.ExistsAsync(myId, user.Id),
            });
        }
        return Ok(result);
    }

    // Perfil público de cualquier usuario, con sus tops y si ya le sigo
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetProfile(Guid id)
    {
        var user = await users.GetByIdAsync(id);
        if (user is null) return NotFound();

        var topArtists = await tops.GetTopArtistsAsync(id);
        var topTracks = await tops.GetTopTracksAsync(id);

        return Ok(new
        {
            user.Id,
            user.DisplayName,
            user.AvatarUrl,
            Followers = await follows.CountFollowersAsync(id),
            Following = await follows.CountFollowingAsync(id),
            IsFollowedByMe = await follows.ExistsAsync(User.GetUserId(), id),
            TopArtists = topArtists.Select(a => new { a.SpotifyArtistId, a.Name, a.Genres, a.Rank }),
            TopTracks = topTracks.Select(t => new { t.SpotifyTrackId, t.Name, t.ArtistName, t.Rank }),
        });
    }

    [HttpPost("{id:guid}/follow")]
    public async Task<IActionResult> Follow(Guid id)
    {
        var myId = User.GetUserId();
        if (id == myId)
        {
            return BadRequest(new { message = "No puedes seguirte a ti mismo." });
        }
        if (await users.GetByIdAsync(id) is null) return NotFound();

        // Idempotente: seguir a quien ya sigues no es un error
        if (!await follows.ExistsAsync(myId, id))
        {
            await follows.AddAsync(new Follow { FollowerId = myId, FollowingId = id });
            await follows.SaveChangesAsync();
        }
        return NoContent();
    }

    [HttpDelete("{id:guid}/follow")]
    public async Task<IActionResult> Unfollow(Guid id)
    {
        await follows.RemoveAsync(User.GetUserId(), id);
        await follows.SaveChangesAsync();
        return NoContent();
    }
}
