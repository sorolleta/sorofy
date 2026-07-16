using SameSpot.Api.Models;
using SameSpot.Api.Repositories;

namespace SameSpot.Api.Services;

// Ecos: el rastro silencioso de lo que tus notas han movido. Sin cifras
// públicas ni "a X personas les gusta" — se calcula al vuelo a partir de
// lo que ya existe (likes, comentarios, descubrimientos, seguidores,
// estanterías), no de una tabla de notificaciones propia.
public class EcosService(
    INoteLikeRepository likes,
    INoteCommentRepository comments,
    IDiscoveryRepository discoveries,
    IFollowRepository follows,
    IListaRepository listas,
    ITopItemsRepository tops,
    IUserRepository users)
{
    private const int PerSourceLimit = 30;

    public async Task<List<EcoItem>> GetEcosAsync(Guid userId)
    {
        var items = await CollectAsync(userId);
        // "Tenéis a X en común": solo para los follows que van a mostrarse,
        // que la campana no pague consultas de tops que nadie verá
        var enriched = new List<EcoItem>(items.Count);
        HashSet<string>? myArtists = null;
        foreach (var eco in items)
        {
            if (eco.Kind != EcoKind.Followed)
            {
                enriched.Add(eco);
                continue;
            }
            myArtists ??= (await tops.GetTopArtistsAsync(userId)).Select(a => a.Name).ToHashSet();
            var theirs = await tops.GetTopArtistsAsync(eco.ActorId);
            var common = theirs.FirstOrDefault(a => myArtists.Contains(a.Name));
            enriched.Add(eco with { CommonArtist = common?.Name });
        }
        return enriched;
    }

    private async Task<List<EcoItem>> CollectAsync(Guid userId)
    {
        var user = await users.GetByIdAsync(userId);
        var since = user?.LastEcosReadAt;

        var likedItems = (await likes.GetRecentReceivedAsync(userId, PerSourceLimit))
            .Select(l => new EcoItem(
                $"like:{l.NoteId}:{l.UserId}",
                EcoKind.Liked,
                l.CreatedAt,
                l.User.Id,
                l.User.DisplayName,
                l.User.AvatarUrl,
                l.Note.Id,
                l.Note.MusicItem.Id,
                l.Note.MusicItem.Name,
                l.Note.MusicItem.ImageUrl,
                Quote: null));

        var commentedItems = (await comments.GetRecentReceivedAsync(userId, PerSourceLimit))
            .Select(c => new EcoItem(
                $"comment:{c.Id}",
                EcoKind.Commented,
                c.CreatedAt,
                c.User.Id,
                c.User.DisplayName,
                c.User.AvatarUrl,
                c.Note.Id,
                c.Note.MusicItem.Id,
                c.Note.MusicItem.Name,
                c.Note.MusicItem.ImageUrl,
                Quote: c.Text));

        var discoveredItems = (await discoveries.GetRecentByAuthorAsync(userId, PerSourceLimit))
            .Select(d => new EcoItem(
                $"discovery:{d.Id}",
                EcoKind.Discovered,
                d.SavedAt,
                d.User.Id,
                d.User.DisplayName,
                d.User.AvatarUrl,
                NoteId: null,
                d.MusicItem.Id,
                d.MusicItem.Name,
                d.MusicItem.ImageUrl,
                Quote: null));

        var followedItems = (await follows.GetRecentFollowersAsync(userId, PerSourceLimit))
            .Select(f => new EcoItem(
                $"follow:{f.FollowerId}:{f.FollowingId}",
                EcoKind.Followed,
                f.CreatedAt,
                f.Follower.Id,
                f.Follower.DisplayName,
                f.Follower.AvatarUrl,
                NoteId: null,
                MusicItemId: null,
                MusicItemName: null,
                MusicItemImageUrl: null,
                Quote: null));

        var listaSavedItems = (await listas.GetRecentSavesReceivedAsync(userId, PerSourceLimit))
            .Select(s => new EcoItem(
                $"lista-save:{s.ListaId}:{s.UserId}",
                EcoKind.ListaSaved,
                s.CreatedAt,
                s.User.Id,
                s.User.DisplayName,
                s.User.AvatarUrl,
                NoteId: null,
                MusicItemId: null,
                MusicItemName: null,
                MusicItemImageUrl: null,
                Quote: null)
            {
                ListaId = s.ListaId,
                ListaTitle = s.Lista.Title,
            });

        var listaAddedItems = (await listas.GetRecentItemsReceivedAsync(userId, PerSourceLimit))
            .Select(i => new EcoItem(
                $"lista-item:{i.Id}",
                EcoKind.ListaAdded,
                i.CreatedAt,
                i.AddedByUser.Id,
                i.AddedByUser.DisplayName,
                i.AddedByUser.AvatarUrl,
                NoteId: null,
                i.MusicItem.Id,
                i.MusicItem.Name,
                i.MusicItem.ImageUrl,
                Quote: i.Text)
            {
                ListaId = i.ListaId,
                ListaTitle = i.Lista.Title,
            });

        return likedItems
            .Concat(commentedItems)
            .Concat(discoveredItems)
            .Concat(followedItems)
            .Concat(listaSavedItems)
            .Concat(listaAddedItems)
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => e with { HasUnread = since is null || e.CreatedAt > since })
            .Take(50)
            .ToList();
    }

    public Task MarkReadAsync(Guid userId) => users.SetLastEcosReadAtAsync(userId, DateTime.UtcNow);

    // Para el punto de la campana: si hay algo sin leer, sin que el frontend
    // tenga que pedir la lista entera solo para pintar un punto (ni pagar
    // el cálculo de artistas en común de los follows)
    public async Task<bool> HasUnreadAsync(Guid userId) =>
        (await CollectAsync(userId)).Any(e => e.HasUnread);
}

public static class EcoKind
{
    public const string Liked = "liked";
    public const string Commented = "commented";
    public const string Discovered = "discovered";
    public const string Followed = "followed";
    public const string ListaSaved = "listaSaved";
    public const string ListaAdded = "listaAdded";
}

public record EcoItem(
    string Id,
    string Kind,
    DateTime CreatedAt,
    Guid ActorId,
    string ActorName,
    string? ActorAvatarUrl,
    Guid? NoteId,
    Guid? MusicItemId,
    string? MusicItemName,
    string? MusicItemImageUrl,
    string? Quote)
{
    public bool HasUnread { get; init; }
    // Solo ecos de estanterías: cuál
    public Guid? ListaId { get; init; }
    public string? ListaTitle { get; init; }
    // Solo follows: "Tenéis a X en común"
    public string? CommonArtist { get; init; }
}
