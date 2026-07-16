using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SameSpot.Api.Config;
using SameSpot.Api.Extensions;
using SameSpot.Api.Repositories;

namespace SameSpot.Api.Controllers;

// Onboarding obligatorio del primer login: 3-4 tags estéticos + provincia.
// Con esto el feed nunca nace vacío: son la señal para mapear al usuario
// con perfiles afines y para la proximidad local.
[ApiController]
[Authorize]
[Route("api/onboarding")]
public class OnboardingController(
    IUserRepository users,
    ITagRepository tags,
    IFollowRepository follows,
    IGroupFollowRepository groupFollows,
    IMusicItemRepository items) : ControllerBase
{
    public record CompleteRequest(List<int>? TagIds, string? Province);

    // Las opciones del formulario: catálogo de tags y provincias válidas
    [HttpGet]
    public async Task<IActionResult> GetOptions()
    {
        var allTags = await tags.GetAllAsync();
        return Ok(new
        {
            Tags = allTags.Select(t => new { t.Id, t.Name }),
            Provinces = SpainProvinces.All,
        });
    }

    // Guarda intereses y provincia. Repetirlo los reemplaza, así el mismo
    // endpoint servirá para editarlos desde el perfil más adelante.
    [HttpPost]
    public async Task<IActionResult> Complete(CompleteRequest request)
    {
        var tagIds = (request.TagIds ?? []).Distinct().ToList();
        if (tagIds.Count is < 3 or > 4)
        {
            return BadRequest(new { message = "Elige entre 3 y 4 tags." });
        }
        if (request.Province is null || !SpainProvinces.IsValid(request.Province))
        {
            return BadRequest(new { message = "Elige una provincia de la lista." });
        }

        var chosenTags = await tags.GetByIdsAsync(tagIds);
        if (chosenTags.Count != tagIds.Count)
        {
            return BadRequest(new { message = "Alguno de los tags no existe." });
        }

        var me = await users.GetByIdWithTagsAsync(User.GetUserId());
        if (me is null) return NotFound();

        me.Tags.Clear();
        me.Tags.AddRange(chosenTags);
        me.Province = request.Province;
        me.OnboardingCompletedAt ??= DateTime.UtcNow;
        await users.SaveChangesAsync();

        return Ok(new
        {
            Tags = chosenTags.Select(t => t.Name),
            me.Province,
        });
    }

    // Paso 3 del onboarding: "sigue a alguien para empezar", para que el
    // feed no llegue vacío el primer día. Usa la provincia y los tags recién
    // guardados; cada sugerencia explica por qué llega.
    [HttpGet("suggestions")]
    public async Task<IActionResult> GetSuggestions()
    {
        var myId = User.GetUserId();
        var me = await users.GetByIdWithTagsAsync(myId);
        if (me is null) return NotFound();

        var myTags = me.Tags.Select(t => t.Name).ToHashSet();

        var people = new List<object>();
        // Primero quien comparte provincia, luego quien comparte sensibilidad
        foreach (var user in (await users.GetAllExceptWithTagsAsync(myId))
            .OrderByDescending(u => u.Province is not null && u.Province == me.Province)
            .ThenByDescending(u => u.Tags.Any(t => myTags.Contains(t.Name)))
            .Take(5))
        {
            var sharedTag = user.Tags.FirstOrDefault(t => myTags.Contains(t.Name));
            var reason = user.Province is not null && user.Province == me.Province
                ? "De tu misma provincia"
                : sharedTag is not null ? $"Le gusta {sharedTag.Name.ToLowerInvariant()}" : null;
            people.Add(new
            {
                user.Id,
                user.DisplayName,
                user.AvatarUrl,
                Reason = reason,
                IsFollowedByMe = await follows.ExistsAsync(myId, user.Id),
            });
        }

        var groups = new List<object>();
        if (me.Province is not null)
        {
            foreach (var group in await items.GetLocalGroupsByProvinceAsync(me.Province, 3))
            {
                groups.Add(new
                {
                    group.Id,
                    group.Name,
                    group.ImageUrl,
                    group.Category,
                    group.Province,
                    IsFollowedByMe = await groupFollows.ExistsAsync(myId, group.Id),
                });
            }
        }

        return Ok(new { People = people, Groups = groups });
    }
}
