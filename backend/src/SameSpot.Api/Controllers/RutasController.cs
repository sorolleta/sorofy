using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SameSpot.Api.Data;
using SameSpot.Api.Extensions;
using SameSpot.Api.Models;
using SameSpot.Api.Repositories;

namespace SameSpot.Api.Controllers;

// Rutas de escucha («Por dónde empezar»): mapas de discos para entrar en un
// artista de la mano de quien ya lo conoce. Sin estrellas ni contadores
// públicos; el progreso de cada cual es privado.
[ApiController]
[Authorize]
[Route("api/rutas")]
public class RutasController(AppDbContext db, IFollowRepository follows, ITopItemsRepository tops) : ControllerBase
{
    private const int MaxBranches = 8;
    private const int MaxNodesPerBranch = 12;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public record SaveRutaRequest(
        string? Title, string? Intro, string? ArtistName, string? ArtistSpotifyId,
        List<RutaBranch>? Branches, Guid? AnswersRequestId);

    public record CreateRequestRequest(string? ArtistName, string? ArtistSpotifyId);

    // Todas, de la más reciente a la más antigua (para Listas)
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var myId = User.GetUserId();
        var rutas = await db.Rutas.Include(r => r.Author).OrderByDescending(r => r.UpdatedAt).Take(30).ToListAsync();
        return Ok(rutas.Select(r => ToCard(r, myId)));
    }

    // La ruta destacada de la columna derecha del Feed y de Listas
    // (pickSideRoute). Cambia como mucho una vez al día para que no «baile».
    [HttpGet("side")]
    public async Task<IActionResult> GetSide()
    {
        var myId = User.GetUserId();
        var followingIds = (await follows.GetFollowingUsersAsync(myId)).Select(u => u.Id).ToList();
        var myArtists = (await tops.GetTopArtistsAsync(myId)).Select(a => a.Name.ToLowerInvariant()).ToHashSet();
        var all = await db.Rutas.Include(r => r.Author).Where(r => r.AuthorId != myId).ToListAsync();
        if (all.Count == 0) return NoContent();

        // 1. De alguien que sigues, sobre un artista que tú no escuchas
        var candidates = all
            .Where(r => followingIds.Contains(r.AuthorId) && !myArtists.Contains(r.ArtistName.ToLowerInvariant()))
            .OrderByDescending(r => r.UpdatedAt)
            .ToList();

        // 2. La más guardada dentro de tu círculo (el número nunca se muestra)
        if (candidates.Count == 0)
        {
            var savedInCircle = await db.RutaSaves
                .Where(s => followingIds.Contains(s.UserId))
                .GroupBy(s => s.RutaId)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToListAsync();
            candidates = all
                .Where(r => savedInCircle.Any(s => s.Key == r.Id))
                .OrderByDescending(r => savedInCircle.First(s => s.Key == r.Id).Count)
                .ToList();
        }

        // 3. Sin círculo (p. ej. invitados): cualquier ruta, para que la demo no quede vacía
        if (candidates.Count == 0) candidates = [.. all.OrderByDescending(r => r.UpdatedAt)];

        var pick = candidates[DateTime.UtcNow.DayOfYear % Math.Min(candidates.Count, 3)];
        return Ok(ToCard(pick, myId));
    }

    // Rutas sobre un artista (ficha de artista): primero las de tu gente
    [HttpGet("artist")]
    public async Task<IActionResult> GetForArtist(string? name, string? spotifyId)
    {
        if (string.IsNullOrWhiteSpace(name) && string.IsNullOrWhiteSpace(spotifyId)) return Ok(Array.Empty<object>());
        var myId = User.GetUserId();
        var followingIds = (await follows.GetFollowingUsersAsync(myId)).Select(u => u.Id).ToHashSet();
        var lowered = name?.Trim().ToLower();
        var rutas = await db.Rutas.Include(r => r.Author)
            .Where(r => (spotifyId != null && r.ArtistSpotifyId == spotifyId) || (lowered != null && r.ArtistName.ToLower() == lowered))
            .ToListAsync();
        return Ok(rutas
            .OrderByDescending(r => followingIds.Contains(r.AuthorId))
            .ThenByDescending(r => r.UpdatedAt)
            .Select(r => ToCard(r, myId)));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var myId = User.GetUserId();
        var ruta = await db.Rutas.Include(r => r.Author).FirstOrDefaultAsync(r => r.Id == id);
        if (ruta is null) return NotFound();
        var done = await db.RutaProgress.Where(p => p.UserId == myId && p.RutaId == id).Select(p => p.NodeId).ToListAsync();
        var saved = await db.RutaSaves.AnyAsync(s => s.UserId == myId && s.RutaId == id);
        var forkedFrom = ruta.ForkedFromId is Guid f
            ? await db.Rutas.Include(r => r.Author).Where(r => r.Id == f)
                .Select(r => new { r.Id, r.Title, AuthorName = r.Author.DisplayName }).FirstOrDefaultAsync()
            : null;
        return Ok(new
        {
            Card = ToCard(ruta, myId),
            Branches = Branches(ruta),
            Done = done,
            IsSaved = saved,
            ForkedFrom = forkedFrom,
            ruta.ArtistSpotifyId,
            ruta.AnswersRequestId,
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create(SaveRutaRequest request)
    {
        var myId = User.GetUserId();
        var ruta = new Ruta { Id = Guid.NewGuid(), Title = "", ArtistName = "", AuthorId = myId };
        var error = Apply(ruta, request);
        if (error is not null) return BadRequest(new { message = error });

        if (request.AnswersRequestId is Guid requestId)
        {
            var answered = await db.RutaRequests.FindAsync(requestId);
            if (answered is not null && answered.AnsweredByRutaId is null)
            {
                answered.AnsweredByRutaId = ruta.Id;
                ruta.AnswersRequestId = requestId;
            }
        }
        db.Rutas.Add(ruta);
        await db.SaveChangesAsync();
        return Ok(new { ruta.Id });
    }

    // El editor guarda la ruta entera de una vez
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, SaveRutaRequest request)
    {
        var ruta = await db.Rutas.FindAsync(id);
        if (ruta is null) return NotFound();
        if (ruta.AuthorId != User.GetUserId()) return Forbid();
        var error = Apply(ruta, request);
        if (error is not null) return BadRequest(new { message = error });
        ruta.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { ruta.Id });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var ruta = await db.Rutas.FindAsync(id);
        if (ruta is null) return NotFound();
        if (ruta.AuthorId != User.GetUserId()) return Forbid();
        db.Rutas.Remove(ruta);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // «Hacer la mía»: copia la ruta como tuya para editarla
    [HttpPost("{id:guid}/fork")]
    public async Task<IActionResult> Fork(Guid id)
    {
        var source = await db.Rutas.Include(r => r.Author).FirstOrDefaultAsync(r => r.Id == id);
        if (source is null) return NotFound();
        var copy = new Ruta
        {
            Id = Guid.NewGuid(),
            Title = source.Title,
            Intro = source.Intro,
            AuthorId = User.GetUserId(),
            ArtistName = source.ArtistName,
            ArtistSpotifyId = source.ArtistSpotifyId,
            BranchesJson = source.BranchesJson,
            ForkedFromId = source.Id,
        };
        db.Rutas.Add(copy);
        await db.SaveChangesAsync();
        return Ok(new { copy.Id });
    }

    // Marcar/desmarcar una parada como escuchada (privado)
    [HttpPost("{id:guid}/done/{nodeId}")]
    public async Task<IActionResult> ToggleDone(Guid id, string nodeId)
    {
        var myId = User.GetUserId();
        if (!await db.Rutas.AnyAsync(r => r.Id == id)) return NotFound();
        var existing = await db.RutaProgress.FindAsync(myId, id, nodeId);
        if (existing is null) db.RutaProgress.Add(new RutaProgress { UserId = myId, RutaId = id, NodeId = nodeId });
        else db.RutaProgress.Remove(existing);
        await db.SaveChangesAsync();
        return Ok(new { done = existing is null });
    }

    [HttpPost("{id:guid}/save")]
    public async Task<IActionResult> SaveRuta(Guid id)
    {
        var myId = User.GetUserId();
        if (!await db.Rutas.AnyAsync(r => r.Id == id)) return NotFound();
        if (!await db.RutaSaves.AnyAsync(s => s.UserId == myId && s.RutaId == id))
        {
            db.RutaSaves.Add(new RutaSave { UserId = myId, RutaId = id });
            await db.SaveChangesAsync();
        }
        return NoContent();
    }

    [HttpDelete("{id:guid}/save")]
    public async Task<IActionResult> UnsaveRuta(Guid id)
    {
        var myId = User.GetUserId();
        var save = await db.RutaSaves.FindAsync(myId, id);
        if (save is not null)
        {
            db.RutaSaves.Remove(save);
            await db.SaveChangesAsync();
        }
        return NoContent();
    }

    // «¿Por dónde empiezo con X?»: las peticiones sin responder de tu gente
    // (y las tuyas). Sin círculo, las últimas de cualquiera, para la demo.
    [HttpGet("requests")]
    public async Task<IActionResult> GetRequests()
    {
        var myId = User.GetUserId();
        var followingIds = (await follows.GetFollowingUsersAsync(myId)).Select(u => u.Id).ToList();
        var open = db.RutaRequests.Include(r => r.FromUser).Where(r => r.AnsweredByRutaId == null);
        var list = await open.Where(r => followingIds.Contains(r.FromUserId) || r.FromUserId == myId)
            .OrderByDescending(r => r.CreatedAt).Take(6).ToListAsync();
        if (list.Count == 0) list = await open.OrderByDescending(r => r.CreatedAt).Take(4).ToListAsync();
        return Ok(list.Select(r => new
        {
            r.Id,
            r.ArtistName,
            r.ArtistSpotifyId,
            r.CreatedAt,
            IsMine = r.FromUserId == myId,
            From = new { r.FromUser.Id, r.FromUser.DisplayName, r.FromUser.AvatarUrl },
        }));
    }

    [HttpPost("requests")]
    public async Task<IActionResult> CreateRequest(CreateRequestRequest request)
    {
        var artist = request.ArtistName?.Trim();
        if (string.IsNullOrWhiteSpace(artist)) return BadRequest(new { message = "¿Con qué artista quieres empezar?" });
        var req = new RutaRequest
        {
            Id = Guid.NewGuid(),
            FromUserId = User.GetUserId(),
            ArtistName = artist.Length > 200 ? artist[..200] : artist,
            ArtistSpotifyId = request.ArtistSpotifyId,
        };
        db.RutaRequests.Add(req);
        await db.SaveChangesAsync();
        return Ok(new { req.Id });
    }

    // ---------- helpers ----------

    private static List<RutaBranch> Branches(Ruta r) =>
        JsonSerializer.Deserialize<List<RutaBranch>>(r.BranchesJson, Json) ?? [];

    private static string? Trim(string? text, int max) =>
        string.IsNullOrWhiteSpace(text) ? null : (text.Trim().Length > max ? text.Trim()[..max] : text.Trim());

    // Valida y limpia lo que manda el editor; devuelve el error o null
    private static string? Apply(Ruta ruta, SaveRutaRequest request)
    {
        var title = Trim(request.Title, 120);
        var artist = Trim(request.ArtistName, 200);
        if (title is null) return "Ponle un título a la ruta.";
        if (artist is null) return "¿De qué artista es la ruta?";
        var branches = (request.Branches ?? []).Take(MaxBranches).ToList();

        var seenIds = new HashSet<string>();
        foreach (var b in branches)
        {
            b.Label = Trim(b.Label, 60) ?? "Rama";
            b.BridgeLead = Trim(b.BridgeLead, 80);
            b.Bridge = Trim(b.Bridge, 300);
            b.Nodes = b.Nodes.Take(MaxNodesPerBranch).Where(n => !string.IsNullOrWhiteSpace(n.Title)).ToList();
            foreach (var n in b.Nodes)
            {
                if (string.IsNullOrWhiteSpace(n.Id) || !seenIds.Add(n.Id)) n.Id = Guid.NewGuid().ToString("N")[..10];
                n.Title = Trim(n.Title, 120)!;
                n.Artist = Trim(n.Artist, 120);
                n.Year = Trim(n.Year, 4);
                n.ItemType = n.ItemType is "track" ? "track" : "album";
                n.Lead = Trim(n.Lead, 60);
                n.LeadText = Trim(n.LeadText, 200);
                n.EdgeLead = Trim(n.EdgeLead, 60);
                n.Edge = Trim(n.Edge, 240);
                n.Why = Trim(n.Why, 400);
            }
        }
        var nodes = branches.SelectMany(b => b.Nodes).ToList();
        if (nodes.Count == 0) return "Añade al menos un disco a la ruta.";
        // Exactamente una parada de inicio: si no hay, la primera
        var start = nodes.FirstOrDefault(n => n.IsStart) ?? nodes[0];
        foreach (var n in nodes) n.IsStart = n == start;

        ruta.Title = title;
        ruta.Intro = Trim(request.Intro, 600);
        ruta.ArtistName = artist;
        ruta.ArtistSpotifyId = Trim(request.ArtistSpotifyId, 40);
        ruta.BranchesJson = JsonSerializer.Serialize(branches, Json);
        return null;
    }

    // La tarjeta de una ruta: lo que pintan el Feed, Listas, la ficha y el chat
    private static object ToCard(Ruta r, Guid myId)
    {
        var branches = Branches(r);
        var nodes = branches.SelectMany(b => b.Nodes).ToList();
        var start = nodes.FirstOrDefault(n => n.IsStart) ?? nodes.FirstOrDefault();
        var strip = start is null ? nodes : [start, .. nodes.Where(n => n != start)];
        return new
        {
            r.Id,
            r.Title,
            r.Intro,
            r.ArtistName,
            Author = new { r.Author.Id, r.Author.DisplayName, r.Author.AvatarUrl, r.Author.Province },
            NodeCount = nodes.Count,
            BranchCount = branches.Count,
            Start = start is null ? null : new { start.Title, start.ImageUrl, start.Lead, start.LeadText, start.Why },
            Strip = strip.Take(4).Select(n => new { n.Title, n.ImageUrl }),
            IsMine = r.AuthorId == myId,
            r.UpdatedAt,
        };
    }
}
