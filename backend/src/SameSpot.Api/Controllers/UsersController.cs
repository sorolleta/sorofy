using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SameSpot.Api.Extensions;
using SameSpot.Api.Models;
using SameSpot.Api.Repositories;
using SameSpot.Api.Services;

namespace SameSpot.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/users")]
public class UsersController(
    IUserRepository users,
    IFollowRepository follows,
    ITopItemsRepository tops,
    INoteRepository notes,
    IDiscoveryRepository discoveries,
    AffinityService affinity) : ControllerBase
{
    // La bitácora de un usuario: sus notas, para verlas en su perfil público
    [HttpGet("{id:guid}/notes")]
    public async Task<IActionResult> GetNotes(Guid id)
    {
        if (await users.GetByIdAsync(id) is null) return NotFound();

        var userNotes = await notes.GetByUserAsync(id);
        return Ok(userNotes.Select(NotesController.ToResponse));
    }

    // % de afinidad musical entre el usuario autenticado y otro usuario
    [HttpGet("{id:guid}/affinity")]
    public async Task<IActionResult> GetAffinity(Guid id)
    {
        var myId = User.GetUserId();
        if (id == myId)
        {
            return BadRequest(new { message = "La afinidad se calcula con otro usuario." });
        }
        if (await users.GetByIdAsync(id) is null) return NotFound();

        return Ok(await affinity.GetAffinityAsync(myId, id));
    }

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
            // El contador de confianza privado del manifiesto: cuántas
            // canciones guardé gracias a las notas de esta persona
            TrustCount = await discoveries.CountByAuthorAsync(User.GetUserId(), id),
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
