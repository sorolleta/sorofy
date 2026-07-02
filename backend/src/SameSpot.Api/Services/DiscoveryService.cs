using System.Net;
using SameSpot.Api.Models;
using SameSpot.Api.Repositories;

namespace SameSpot.Api.Services;

// El puente con Spotify: guardar una canción descubierta en el feed la mete
// en la playlist "Mis Descubrimientos de SameSpot" del usuario (privada, se
// crea la primera vez) y deja registro de a quién se lo debe.
public class DiscoveryService(
    IDiscoveryRepository discoveries,
    INoteRepository notes,
    IUserRepository users,
    SpotifyApiService spotify)
{
    private const string PlaylistName = "Mis Descubrimientos de SameSpot";
    private const string PlaylistDescription =
        "Música que descubrí gracias a la gente de SameSpot.";

    public record SaveResult(Discovery? Discovery, string? Error);

    public async Task<SaveResult> SaveAsync(Guid myId, Guid noteId)
    {
        var note = await notes.GetByIdAsync(noteId);
        if (note is null)
        {
            return new SaveResult(null, "Esa nota no existe.");
        }
        if (note.UserId == myId)
        {
            return new SaveResult(null, "La nota es tuya: no hay nada que descubrir.");
        }
        if (note.MusicItem.Type != MusicItemType.Track || note.MusicItem.SpotifyId is null)
        {
            return new SaveResult(null, "Solo se pueden guardar canciones de Spotify.");
        }

        // Idempotente: guardar dos veces devuelve el descubrimiento original
        var existing = await discoveries.GetByUserAndItemAsync(myId, note.MusicItemId);
        if (existing is not null)
        {
            return new SaveResult(existing, null);
        }

        var me = (await users.GetByIdAsync(myId))!;
        try
        {
            if (me.DiscoveriesPlaylistId is null)
            {
                me.DiscoveriesPlaylistId =
                    await spotify.CreatePlaylistAsync(myId, PlaylistName, PlaylistDescription);
            }
            await spotify.AddPlaylistTrackAsync(myId, me.DiscoveriesPlaylistId, note.MusicItem.SpotifyId);
        }
        catch (HttpRequestException e) when (e.StatusCode == HttpStatusCode.Forbidden)
        {
            // Token de antes de pedir el scope de playlists: hay que re-consentir
            return new SaveResult(null,
                "Spotify no nos deja tocar tus playlists todavía: cierra sesión y vuelve a entrar para conceder el permiso.");
        }

        var discovery = new Discovery
        {
            Id = Guid.NewGuid(),
            UserId = myId,
            AuthorId = note.UserId,
            MusicItemId = note.MusicItemId,
            NoteId = note.Id,
            SavedAt = DateTime.UtcNow,
        };
        await discoveries.AddAsync(discovery);
        // Guarda también el DiscoveriesPlaylistId si se acaba de crear
        await discoveries.SaveChangesAsync();

        return new SaveResult(discovery, null);
    }
}
