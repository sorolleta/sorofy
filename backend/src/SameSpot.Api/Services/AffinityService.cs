using SameSpot.Api.Repositories;

namespace SameSpot.Api.Services;

// Carga los tops de dos usuarios y les aplica el cálculo de afinidad.
public class AffinityService(ITopItemsRepository tops, MusicAffinityCalculator calculator)
{
    public async Task<AffinityResponse> GetAffinityAsync(Guid myId, Guid otherId)
    {
        var myArtists = await tops.GetTopArtistsAsync(myId);
        var myTracks = await tops.GetTopTracksAsync(myId);
        var theirArtists = await tops.GetTopArtistsAsync(otherId);
        var theirTracks = await tops.GetTopTracksAsync(otherId);

        var result = calculator.Calculate(
            new UserMusicProfile(
                myArtists.Select(a => a.SpotifyArtistId).ToList(),
                myTracks.Select(t => t.SpotifyTrackId).ToList()),
            new UserMusicProfile(
                theirArtists.Select(a => a.SpotifyArtistId).ToList(),
                theirTracks.Select(t => t.SpotifyTrackId).ToList()));

        // Los ids comunes se traducen a nombres usando mis tops (misma info)
        var commonArtistNames = myArtists
            .Where(a => result.CommonArtistIds.Contains(a.SpotifyArtistId))
            .OrderBy(a => a.Rank)
            .Select(a => a.Name)
            .ToList();
        var commonTrackNames = myTracks
            .Where(t => result.CommonTrackIds.Contains(t.SpotifyTrackId))
            .OrderBy(t => t.Rank)
            .Select(t => $"{t.Name} — {t.ArtistName}")
            .ToList();

        return new AffinityResponse(result.Score, commonArtistNames, commonTrackNames);
    }
}

public record AffinityResponse(int Score, List<string> CommonArtists, List<string> CommonTracks);
