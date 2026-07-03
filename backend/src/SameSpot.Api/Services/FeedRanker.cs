using SameSpot.Api.Models;

namespace SameSpot.Api.Services;

// El "algoritmo invisible" del feed. Ordena las notas del círculo con una
// puntuación explicable:
//
//   puntuación = 0.6 * afinidad con el autor + 0.4 * frescura de la nota
//
// y reserva 1 de cada 5 huecos (20%) para notas de gente que NO sigues:
// el "amplificador de horizontes" que evita la burbuja. Sin likes ni
// contadores: la relevancia sale de la confianza y la novedad, no de la masa.
public class FeedRanker
{
    private const double AffinityWeight = 0.6;
    private const double FreshnessWeight = 0.4;
    private const int HorizonSlot = 5;

    public List<Note> Rank(List<FeedCandidate> circle, List<HorizonCandidate> horizon, DateTime now)
    {
        var orderedCircle = circle
            .OrderByDescending(c => Score(c, now))
            .Select(c => c.Note)
            .ToList();

        // En el horizonte mandan las recomendaciones dirigidas (ancladas a
        // un artista que el lector ya escucha) y después la novedad
        var orderedHorizon = new Queue<Note>(horizon
            .OrderByDescending(h => h.MatchesTaste)
            .ThenByDescending(h => h.Note.CreatedAt)
            .Select(h => h.Note));

        // Mezcla: cada quinto hueco es de horizonte; si un lado se agota,
        // el otro rellena (un usuario sin seguidos ve solo horizonte, que
        // hace de feed de bienvenida)
        var feed = new List<Note>();
        var circleIndex = 0;
        while (circleIndex < orderedCircle.Count || orderedHorizon.Count > 0)
        {
            var isHorizonSlot = (feed.Count + 1) % HorizonSlot == 0;
            if ((isHorizonSlot || circleIndex >= orderedCircle.Count) && orderedHorizon.Count > 0)
            {
                feed.Add(orderedHorizon.Dequeue());
            }
            else
            {
                feed.Add(orderedCircle[circleIndex++]);
            }
        }
        return feed;
    }

    // La frescura decae con la edad: una nota de hoy vale 1, una de ayer
    // 0.5, una de hace una semana ~0.12
    private static double Score(FeedCandidate candidate, DateTime now)
    {
        var days = Math.Max(0, (now - candidate.Note.CreatedAt).TotalDays);
        var freshness = 1.0 / (1.0 + days);
        return AffinityWeight * (candidate.AffinityScore / 100.0) + FreshnessWeight * freshness;
    }
}

// Una nota del círculo junto con la afinidad (0-100) con su autor
public record FeedCandidate(Note Note, int AffinityScore);

// Una nota de horizonte; MatchesTaste = su ancla apunta a un artista que
// el lector ya escucha, así que va primero en los huecos de horizonte
public record HorizonCandidate(Note Note, bool MatchesTaste);
