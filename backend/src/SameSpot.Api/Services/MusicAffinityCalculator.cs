namespace SameSpot.Api.Services;

// Calcula el % de afinidad musical entre dos usuarios comparando sus tops.
// Clase pura (sin BD ni HTTP) para poder testearla de forma aislada.
//
// Nota: el diseño original incluía géneros en común, pero Spotify retiró
// los géneros de su API en Development Mode (feb. 2026), así que la
// afinidad se basa en artistas (60%) y tracks (40%) en común.
public class MusicAffinityCalculator
{
    private const double ArtistWeight = 0.6;
    private const double TrackWeight = 0.4;

    public AffinityResult Calculate(UserMusicProfile a, UserMusicProfile b)
    {
        var commonArtists = Intersect(a.ArtistIds, b.ArtistIds);
        var commonTracks = Intersect(a.TrackIds, b.TrackIds);

        var artistScore = DimensionScore(a.ArtistIds, b.ArtistIds, commonArtists.Count);
        var trackScore = DimensionScore(a.TrackIds, b.TrackIds, commonTracks.Count);

        var score = CombineScores((artistScore, ArtistWeight), (trackScore, TrackWeight));

        return new AffinityResult(score, commonArtists, commonTracks);
    }

    // Mantiene el orden de la lista A (su ranking) en los elementos comunes
    private static List<string> Intersect(List<string> a, List<string> b)
    {
        var setB = new HashSet<string>(b);
        return a.Distinct().Where(setB.Contains).ToList();
    }

    // Coeficiente de solapamiento: comunes / tamaño del top más pequeño.
    // Así, si un usuario nuevo solo tiene 5 artistas y comparte los 5,
    // la afinidad en esa dimensión es del 100%, no del 25%.
    // Devuelve null si algún usuario no tiene datos en esta dimensión.
    private static double? DimensionScore(List<string> a, List<string> b, int commonCount)
    {
        var minCount = Math.Min(a.Distinct().Count(), b.Distinct().Count());
        if (minCount == 0) return null;
        return (double)commonCount / minCount;
    }

    // Media ponderada de las dimensiones con datos. Si una dimensión no
    // tiene datos, su peso se reparte entre las demás; sin ninguna, 0.
    private static int CombineScores(params (double? Value, double Weight)[] dimensions)
    {
        var available = dimensions.Where(d => d.Value.HasValue).ToList();
        if (available.Count == 0) return 0;

        var totalWeight = available.Sum(d => d.Weight);
        var weightedSum = available.Sum(d => d.Value!.Value * d.Weight);
        return (int)Math.Round(weightedSum / totalWeight * 100);
    }
}

public record UserMusicProfile(List<string> ArtistIds, List<string> TrackIds);

public record AffinityResult(int Score, List<string> CommonArtistIds, List<string> CommonTrackIds);
