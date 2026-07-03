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
    ITagRepository tags) : ControllerBase
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
}
