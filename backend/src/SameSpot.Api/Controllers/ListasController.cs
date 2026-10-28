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
    IUserRepository users,
    SpotifyApiService spotify,
    MusicItemResolverService resolver) : ControllerBase
{
    private const int GridLimit = 30;

    // Se puede crear ya con canciones elegidas (su porqué es opcional: es tuya)
    public record CreateListaRequest(string? Title, string? Mood, List<AddItemRequest>? Items = null);

    // Importar una playlist de Spotify pegando su enlace
    public record ImportPlaylistRequest(string? PlaylistUrl, string? Title, string? Mood);

    private const int ImportLimit = 100;

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

        var myId = User.GetUserId();
        foreach (var (requested, i) in (request.Items ?? []).Select((r, i) => (r, i)))
        {
            var (item, error) = await ResolveItemAsync(requested, myId);
            if (error is not null) return error;
            await listas.AddItemAsync(NewItem(lista.Id, item!.Id, myId, requested.Text, lista.CreatedAt.AddSeconds(i)));
        }
        await listas.SaveChangesAsync();

        var withCurator = await listas.GetByIdAsync(lista.Id);
        return CreatedAtAction(nameof(GetDetail), new { id = lista.Id }, ToDetailResponse(withCurator!, User.GetUserId()));
    }

    // Solo quien la cura puede borrar la estantería entera
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var lista = await listas.GetByIdAsync(id);
        if (lista is null) return NotFound();
        if (lista.CuratorId != User.GetUserId()) return Forbid();

        listas.Remove(lista);
        await listas.SaveChangesAsync();
        return NoContent();
    }

    // Mis estanterías, para elegir dónde añadir desde una ficha
    [HttpGet("mine")]
    public async Task<IActionResult> GetMine()
    {
        var mine = await listas.GetByCuratorAsync(User.GetUserId());
        return Ok(mine.Select(ToCardResponse));
    }

    // Copia la estantería a una playlist privada nueva en el Spotify de quien
    // la pide. Solo entran las canciones: discos, artistas y grupos locales
    // no caben en una playlist, y se cuentan aparte para avisar.
    [HttpPost("{id:guid}/spotify")]
    public async Task<IActionResult> ExportToSpotify(Guid id)
    {
        var lista = await listas.GetByIdAsync(id);
        if (lista is null) return NotFound();

        var myId = User.GetUserId();
        var me = await users.GetByIdAsync(myId);
        if (me is null || me.SpotifyId.StartsWith(AuthController.GuestPrefix))
        {
            return BadRequest(new { message = "Entra con Spotify para guardar estanterías en tu cuenta." });
        }

        var trackIds = lista.Items
            .OrderBy(i => i.CreatedAt)
            .Where(i => i.MusicItem.Type == MusicItemType.Track && i.MusicItem.SpotifyId is not null)
            .Select(i => i.MusicItem.SpotifyId!)
            .Distinct()
            .ToList();
        if (trackIds.Count == 0)
        {
            return BadRequest(new { message = "Esta estantería no tiene canciones que meter en una playlist." });
        }

        try
        {
            var description = $"Estantería de {lista.Curator.DisplayName} en Sorofy" +
                              (lista.Mood is null ? "" : $": {lista.Mood}");
            var playlistId = await spotify.CreatePlaylistAsync(myId, lista.Title, description);
            await spotify.AddPlaylistTracksAsync(myId, playlistId, trackIds);
            return Ok(new
            {
                Url = $"https://open.spotify.com/playlist/{playlistId}",
                Added = trackIds.Count,
                Skipped = lista.Items.Count - trackIds.Count,
            });
        }
        catch (HttpRequestException e) when (e.StatusCode == System.Net.HttpStatusCode.Forbidden)
        {
            return BadRequest(new
            {
                message = "Spotify no nos deja tocar tus playlists todavía: cierra sesión y vuelve a entrar para conceder el permiso.",
            });
        }
    }

    // Crea una estantería nueva con las canciones de una playlist de Spotify
    // (hasta 100). Sus canciones entran sin porqué: se pueden ir contando luego.
    [HttpPost("import")]
    public async Task<IActionResult> ImportPlaylist(ImportPlaylistRequest request)
    {
        var playlistId = ParsePlaylistId(request.PlaylistUrl);
        if (playlistId is null)
        {
            return BadRequest(new { message = "Pega el enlace de una playlist de Spotify (open.spotify.com/playlist/…)." });
        }

        var myId = User.GetUserId();
        SpotifyPlaylistContent? playlist;
        try
        {
            playlist = await spotify.GetPlaylistAsync(myId, playlistId, ImportLimit);
        }
        catch (HttpRequestException e) when (e.StatusCode is System.Net.HttpStatusCode.Forbidden or System.Net.HttpStatusCode.Unauthorized)
        {
            return BadRequest(new { message = "Spotify no nos deja leer esa playlist. Prueba con una tuya o que sea pública." });
        }
        // Spotify no deja a las apps nuevas leer sus playlists oficiales (Top 50,
        // Daily Mix, Descubrimiento semanal...): responden como si no existieran
        if (playlist is null)
        {
            return NotFound(new
            {
                message = "No pudimos leer esa playlist. Las playlists hechas por Spotify (Top 50, Daily Mix…) no se pueden importar; prueba con una creada por ti o por otra persona.",
            });
        }
        if (playlist.Tracks.Count == 0)
        {
            return BadRequest(new { message = "Esa playlist no tiene canciones que podamos importar." });
        }

        var title = string.IsNullOrWhiteSpace(request.Title) ? playlist.Name : request.Title.Trim();
        var mood = string.IsNullOrWhiteSpace(request.Mood) ? playlist.Description : request.Mood.Trim();
        var lista = new Lista
        {
            Id = Guid.NewGuid(),
            Title = title.Length > 120 ? title[..120] : title,
            Mood = mood is { Length: > 200 } ? mood[..200] : mood,
            CuratorId = myId,
            CreatedAt = DateTime.UtcNow,
        };
        await listas.AddAsync(lista);

        // Los datos ya vienen en la playlist: se crean las fichas sin
        // preguntar a Spotify canción por canción
        var seen = new HashSet<string>();
        foreach (var (track, i) in playlist.Tracks.Select((t, i) => (t, i)))
        {
            if (!seen.Add(track.Id)) continue;
            var musicItem = await items.GetBySpotifyIdAsync(MusicItemType.Track, track.Id);
            if (musicItem is null)
            {
                musicItem = new MusicItem
                {
                    Id = Guid.NewGuid(),
                    Type = MusicItemType.Track,
                    SpotifyId = track.Id,
                    Name = track.Name,
                    ArtistName = track.ArtistName,
                    ImageUrl = track.ImageUrl,
                    CreatedAt = DateTime.UtcNow,
                };
                await items.AddAsync(musicItem);
            }
            await listas.AddItemAsync(NewItem(lista.Id, musicItem.Id, myId, null, lista.CreatedAt.AddSeconds(i)));
        }
        await listas.SaveChangesAsync();

        var created = await listas.GetByIdAsync(lista.Id);
        return Ok(ToDetailResponse(created!, myId));
    }

    // Acepta https://open.spotify.com/playlist/ID?si=…, con /intl-es/ y spotify:playlist:ID
    private static string? ParsePlaylistId(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var match = System.Text.RegularExpressions.Regex.Match(raw.Trim(), @"playlist[/:]([A-Za-z0-9]{10,40})");
        return match.Success ? match.Groups[1].Value : null;
    }

    // El item se indica como en las notas: itemType + spotifyItemId, o musicItemId
    private async Task<(MusicItem? Item, IActionResult? Error)> ResolveItemAsync(AddItemRequest request, Guid myId)
    {
        if (request.MusicItemId is Guid musicItemId)
        {
            var found = await items.GetByIdAsync(musicItemId);
            return found is null ? (null, NotFound(new { message = "Ese item no existe." })) : (found, null);
        }

        var itemType = MusicItemResolverService.ParseSpotifyItemType(request.ItemType);
        if (itemType is null || string.IsNullOrWhiteSpace(request.SpotifyItemId))
        {
            return (null, BadRequest(new
            {
                message = "Hacen falta itemType (track/album/artist) y spotifyItemId, o musicItemId.",
            }));
        }
        var result = await resolver.FindOrCreateAsync(myId, itemType.Value, request.SpotifyItemId);
        return result.Error is not null ? (null, NotFound(new { message = result.Error })) : (result.Item, null);
    }

    private static ListaItem NewItem(Guid listaId, Guid musicItemId, Guid userId, string? text, DateTime createdAt) => new()
    {
        Id = Guid.NewGuid(),
        ListaId = listaId,
        MusicItemId = musicItemId,
        AddedByUserId = userId,
        Text = text?.Trim() ?? "",
        CreatedAt = createdAt,
    };

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

        // En tu propia estantería el porqué es opcional; en la de otra
        // persona hay que contar por qué la propones
        var myId = User.GetUserId();
        if (lista.CuratorId != myId && string.IsNullOrWhiteSpace(request.Text))
        {
            return BadRequest(new { message = "Cuenta por qué encaja aquí esta canción." });
        }

        var (item, error) = await ResolveItemAsync(request, myId);
        if (error is not null) return error;
        var listaItem = NewItem(id, item!.Id, myId, request.Text, DateTime.UtcNow);
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
