using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SameSpot.Api.Extensions;
using SameSpot.Api.Models;
using SameSpot.Api.Repositories;
using SameSpot.Api.Services;

namespace SameSpot.Api.Controllers;

// Estanterías: colecciones hechas a mano, con un porqué en cada canción.
// Sin algoritmo ni autoplay. Sin moderación en el MVP: cualquiera puede
// proponer una canción, igual que los grupos locales.
[ApiController]
[Authorize]
[Route("api/listas")]
public class ListasController(
    IListaRepository listas,
    IMusicItemRepository items,
    MusicItemResolverService resolver) : ControllerBase
{
    private const int GridLimit = 30;

    public record CreateListaRequest(string? Title, string? Mood);

    // El item se indica igual que en las notas: itemType+spotifyItemId para
    // Spotify, o musicItemId para un grupo local ya existente
    public record AddItemRequest(
        string? ItemType, string? SpotifyItemId, Guid? MusicItemId, string? Text);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var all = await listas.GetAllAsync(GridLimit);
        return Ok(all.Select(ToCardResponse));
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateListaRequest request)
    {
        var title = request.Title?.Trim();
        if (string.IsNullOrWhiteSpace(title))
        {
            return BadRequest(new { message = "Falta el título de la estantería." });
        }

        var lista = new Lista
        {
            Id = Guid.NewGuid(),
            Title = title,
            Mood = string.IsNullOrWhiteSpace(request.Mood) ? null : request.Mood.Trim(),
            CuratorId = User.GetUserId(),
            CreatedAt = DateTime.UtcNow,
        };
        await listas.AddAsync(lista);
        await listas.SaveChangesAsync();

        var withCurator = await listas.GetByIdAsync(lista.Id);
        return CreatedAtAction(nameof(GetDetail), new { id = lista.Id }, ToDetailResponse(withCurator!, User.GetUserId()));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetDetail(Guid id)
    {
        var lista = await listas.GetByIdAsync(id);
        if (lista is null) return NotFound();
        return Ok(await ToDetailResponseAsync(lista, User.GetUserId()));
    }

    // Proponer una canción: cualquiera puede añadir, con su porqué
    [HttpPost("{id:guid}/items")]
    public async Task<IActionResult> AddItem(Guid id, AddItemRequest request)
    {
        var lista = await listas.GetByIdAsync(id);
        if (lista is null) return NotFound();

        var text = request.Text?.Trim();
        if (string.IsNullOrWhiteSpace(text))
        {
            return BadRequest(new { message = "Cuenta por qué encaja aquí esta canción." });
        }

        var myId = User.GetUserId();
        MusicItem? item;
        if (request.MusicItemId is Guid musicItemId)
        {
            item = await items.GetByIdAsync(musicItemId);
            if (item is null) return NotFound(new { message = "Ese item no existe." });
        }
        else
        {
            var itemType = MusicItemResolverService.ParseSpotifyItemType(request.ItemType);
            if (itemType is null || string.IsNullOrWhiteSpace(request.SpotifyItemId))
            {
                return BadRequest(new
                {
                    message = "Hacen falta itemType (track/album/artist) y spotifyItemId, o musicItemId.",
                });
            }
            var result = await resolver.FindOrCreateAsync(myId, itemType.Value, request.SpotifyItemId);
            if (result.Error is not null) return NotFound(new { message = result.Error });
            item = result.Item!;
        }

        var listaItem = new ListaItem
        {
            Id = Guid.NewGuid(),
            ListaId = id,
            MusicItemId = item.Id,
            AddedByUserId = myId,
            Text = text,
            CreatedAt = DateTime.UtcNow,
        };
        await listas.AddItemAsync(listaItem);
        await listas.SaveChangesAsync();

        var updated = await listas.GetByIdAsync(id);
        return Ok(await ToDetailResponseAsync(updated!, myId));
    }

    // Solo quien la propuso puede quitarla (o quien cura la estantería)
    [HttpDelete("items/{itemId:guid}")]
    public async Task<IActionResult> RemoveItem(Guid itemId)
    {
        var item = await listas.GetItemAsync(itemId);
        if (item is null) return NotFound();

        var myId = User.GetUserId();
        var lista = await listas.GetByIdAsync(item.ListaId);
        if (item.AddedByUserId != myId && lista?.CuratorId != myId)
        {
            return Forbid();
        }

        listas.RemoveItem(item);
        await listas.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:guid}/save")]
    public async Task<IActionResult> SaveLista(Guid id)
    {
        if (await listas.GetByIdAsync(id) is null) return NotFound();
        await listas.SaveListaAsync(User.GetUserId(), id);
        return NoContent();
    }

    [HttpDelete("{id:guid}/save")]
    public async Task<IActionResult> UnsaveLista(Guid id)
    {
        await listas.UnsaveListaAsync(User.GetUserId(), id);
        return NoContent();
    }

    // La tarjeta de la rejilla: collage de hasta 4 carátulas, sin detalle
    private static object ToCardResponse(Lista lista) => new
    {
        lista.Id,
        lista.Title,
        lista.Mood,
        Curator = new { lista.Curator.Id, lista.Curator.DisplayName },
        ItemCount = lista.Items.Count,
        CoverImages = lista.Items
            .OrderBy(i => i.CreatedAt)
            .Select(i => i.MusicItem.ImageUrl)
            .Where(url => url is not null)
            .Take(4),
    };

    private async Task<object> ToDetailResponseAsync(Lista lista, Guid myId) =>
        ToDetailResponse(lista, myId, await listas.IsSavedByAsync(myId, lista.Id));

    private static object ToDetailResponse(Lista lista, Guid myId, bool isSavedByMe = false) => new
    {
        lista.Id,
        lista.Title,
        lista.Mood,
        Curator = new { lista.Curator.Id, lista.Curator.DisplayName },
        IsMine = lista.CuratorId == myId,
        IsSavedByMe = isSavedByMe,
        Items = lista.Items.OrderBy(i => i.CreatedAt).Select(i => new
        {
            i.Id,
            MusicItem = new
            {
                i.MusicItem.Id,
                Type = NotesController.TypeToString(i.MusicItem.Type),
                i.MusicItem.SpotifyId,
                i.MusicItem.Name,
                i.MusicItem.ArtistName,
                i.MusicItem.ImageUrl,
            },
            i.Text,
            AddedBy = new { i.AddedByUser.Id, i.AddedByUser.DisplayName },
            CanRemove = i.AddedByUserId == myId || lista.CuratorId == myId,
        }),
    };
}
