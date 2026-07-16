using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SameSpot.Api.Extensions;
using SameSpot.Api.Models;
using SameSpot.Api.Repositories;
using SameSpot.Api.Services;

namespace SameSpot.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/me")]
public class MeController(
    IUserRepository users,
    ITopItemsRepository tops,
    SpotifyApiService spotify) : ControllerBase
{
    // Perfil propio con los tops guardados en nuestra BD
    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        var userId = User.GetUserId();
        var user = await users.GetByIdWithTagsAsync(userId);
        if (user is null) return NotFound();

        var topArtists = await tops.GetTopArtistsAsync(userId);
        var topTracks = await tops.GetTopTracksAsync(userId);

        return Ok(new
        {
            user.Id,
            user.SpotifyId,
            user.DisplayName,
            user.AvatarUrl,
            user.Province,
            user.CreatedAt,
            Tags = user.Tags.Select(t => t.Name),
            NeedsOnboarding = user.OnboardingCompletedAt is null,
            TopArtists = topArtists.Select(a => new { a.SpotifyArtistId, a.Name, a.Genres, a.Rank, a.ImageUrl }),
            TopTracks = topTracks.Select(t => new
            {
                t.SpotifyTrackId, t.Name, t.ArtistName, t.Rank,
                t.ImageUrl, t.AlbumSpotifyId, t.AlbumName,
            }),
            LastSync = topArtists.FirstOrDefault()?.FetchedAt,
        });
    }

    // Importa de Spotify los tops del usuario y los guarda, reemplazando los anteriores
    [HttpPost("sync")]
    public async Task<IActionResult> Sync()
    {
        var userId = User.GetUserId();
        var fetchedAt = DateTime.UtcNow;

        var spotifyArtists = await spotify.GetTopArtistsAsync(userId);
        var spotifyTracks = await spotify.GetTopTracksAsync(userId);

        var artists = spotifyArtists.Select((a, i) => new TopArtist
        {
            UserId = userId,
            SpotifyArtistId = a.Id,
            Name = a.Name,
            Genres = a.Genres ?? [],
            ImageUrl = a.Images?.FirstOrDefault()?.Url,
            Rank = i + 1,
            FetchedAt = fetchedAt,
        }).ToList();

        var tracks = spotifyTracks.Select((t, i) => new TopTrack
        {
            UserId = userId,
            SpotifyTrackId = t.Id,
            Name = t.Name,
            ArtistName = string.Join(", ", t.Artists.Select(a => a.Name)),
            ImageUrl = t.Album?.Images?.FirstOrDefault()?.Url,
            AlbumSpotifyId = t.Album?.Id,
            AlbumName = t.Album?.Name,
            Rank = i + 1,
            FetchedAt = fetchedAt,
        }).ToList();

        await tops.ReplaceTopsAsync(userId, artists, tracks);

        return Ok(new { artists = artists.Count, tracks = tracks.Count, fetchedAt });
    }

    // Lo que el usuario está escuchando ahora mismo (en directo, no se guarda)
    [HttpGet("now-playing")]
    public async Task<IActionResult> NowPlaying()
    {
        var userId = User.GetUserId();
        var nowPlaying = await spotify.GetNowPlayingAsync(userId);

        if (nowPlaying?.Item is null || !nowPlaying.IsPlaying)
        {
            return Ok(new { playing = false });
        }

        return Ok(new
        {
            playing = true,
            track = nowPlaying.Item.Name,
            artist = string.Join(", ", nowPlaying.Item.Artists.Select(a => a.Name)),
        });
    }
}
