using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SameSpot.Api.Models;

namespace SameSpot.Api.Data;

// Las rutas de escucha de ejemplo (las mismas del diseño de Claude Design),
// firmadas por perfiles de la demo, y un par de peticiones abiertas. Solo
// corre si hay perfiles de demo y todavía no existe ninguna ruta.
public partial class DemoSeeder
{
    private record N(string Title, string Artist, string Query, string? Lead = null, string? LeadText = null,
        string? EdgeLead = null, string? Edge = null, string? Why = null);

    private record B(string Label, string? BridgeLead, string? Bridge, N[] Nodes);

    private record R(string Author, string Title, string ArtistName, string Intro, B[] Branches);

    private static readonly R[] DemoRutas =
    [
        new("irene", "Cómo entrar en Sílvia Pérez Cruz", "Sílvia Pérez Cruz",
            "Nueve discos en tres ramas. Empieza por el marcado, sigue las flechas y lee por qué va cada uno donde va.",
        [
            new("Empieza por aquí", "¿Te ha gustado? Vuelve atrás.", "Antes de estos discos ya cantaba en grupo y para cine.",
            [
                new("granada", "Sílvia Pérez Cruz", "granada Silvia Perez Cruz Raul Fernandez", "Empieza aquí.", "Voz y la guitarra eléctrica de Raül, nada más.",
                    "Ahora, con cuerdas.", "Cambia la guitarra por un quinteto. Más quieto, más de noche.",
                    "Es el disco más directo: dos personas tocando en una habitación. Si te atrapa la primera canción, te atrapa ella."),
                new("Vestida de nit", "Sílvia Pérez Cruz", "Vestida de nit Silvia Perez Cruz", EdgeLead: "La obra grande.",
                    Edge: "Se escucha mejor del tirón, como una película.",
                    Why: "Para escucharlo de madrugada y con cascos. Es donde su voz suena más cerca."),
                new("Toda la vida, un día", "Sílvia Pérez Cruz", "Toda la vida un dia Silvia Perez Cruz",
                    Why: "El más ambicioso. Déjalo para cuando ya la conozcas, porque si no puede abrumar."),
            ]),
            new("Hacia atrás", "El mismo Raül.", "Raül Refree, el de «granada», produjo el debut de Rosalía. Por ahí se sale a otras voces.",
            [
                new("Reinas del matute", "Las Migas", "Reinas del matute Las Migas", EdgeLead: "Antes de ir sola.",
                    Edge: "Flamenco a cuatro voces; ella estaba en la formación original.",
                    Why: "Para oír de dónde viene: flamenco compartido, con guitarra y violín."),
                new("11 de novembre", "Sílvia Pérez Cruz", "11 de novembre Silvia Perez Cruz", EdgeLead: "Para cine.",
                    Edge: "Canciones que luego volverán a otras películas.",
                    Why: "El primer disco a su nombre. Aquí ya está todo lo que vendrá después."),
                new("Domus", "Sílvia Pérez Cruz", "Domus Silvia Perez Cruz",
                    Why: "Canciones escritas para una película. Cortas y concretas, y cada una cuenta algo."),
            ]),
            new("Si te quedas con ganas", null, null,
            [
                new("Los Ángeles", "Rosalía", "Los Angeles Rosalia", EdgeLead: "Otra pareja voz + guitarra.",
                    Edge: "Tradición y electrónica de Barcelona.",
                    Why: "Antes de El mal querer: voz y la guitarra de Refree. Es el puente perfecto desde «granada»."),
                new("45 cerebros y 1 corazón", "Maria Arnal i Marcel Bagés", "45 cerebros y 1 corazon Maria Arnal Marcel Bages",
                    EdgeLead: "A la verbena.", Edge: "Lo mismo pero con folclore y mucha fiesta.",
                    Why: "Canto tradicional con máquinas. Si te gustó lo íntimo, este te lo abre."),
                new("Manual de cortejo", "Rodrigo Cuevas", "Manual de cortejo Rodrigo Cuevas",
                    Why: "Para acabar bailando. La ruta empieza en voz baja y termina en fiesta."),
            ]),
        ]),
        new("nerea", "Cómo entrar en Crumb", "Crumb",
            "Ocho discos en tres ramas. Para cuando Locket ya no te basta y no sabes qué viene después.",
        [
            new("Empieza por aquí", "¿Quieres el origen?", "Antes del primer largo sacaron dos EP. De ahí sale la canción que todo el mundo conoce.",
            [
                new("Jinx", "Crumb", "Jinx Crumb", "Empieza aquí.", "Bajo, guitarra limpia y una voz casi susurrada.",
                    "Más luz.", "Abre las ventanas: más rápido y más brillante.",
                    "El más redondo de principio a fin. Ponlo entero un domingo por la tarde."),
                new("Ice Melt", "Crumb", "Ice Melt Crumb", EdgeLead: "Lo nuevo.", Edge: "Se pierde más a propósito; déjalo para el final.",
                    Why: "El que más pongo en bici. Suena a primavera rara."),
                new("AMAMA", "Crumb", "AMAMA Crumb", Why: "El más extraño. Si llegas hasta aquí, ya eres de los suyos."),
            ]),
            new("Hacia atrás", "Misma niebla, otras bandas.", "Si lo que te engancha es ese ambiente, por aquí sigue.",
            [
                new("Locket", "Crumb", "Locket Crumb", EdgeLead: "Todavía más crudo.", Edge: "El primero de todos, sonando a local de ensayo.",
                    Why: "Aquí está la canción por la que los conoce casi todo el mundo."),
                new("Crumb", "Crumb", "Crumb EP Crumb", Why: "Cuatro canciones y ya tienen su sonido. Para completistas."),
            ]),
            new("Si te quedas con ganas", null, null,
            [
                new("Untourable Album", "Men I Trust", "Untourable Album Men I Trust", EdgeLead: "Más groove.",
                    Edge: "Bajo por delante y ganas de moverse.", Why: "La prima tranquila de Crumb. Ideal para trabajar."),
                new("Con Todo El Mundo", "Khruangbin", "Con Todo El Mundo Khruangbin", EdgeLead: "Más psicodelia.",
                    Edge: "Pop californiano que da vueltas.", Why: "Casi sin voz y no le hace falta. Para conducir."),
                new("Skiptracing", "Mild High Club", "Skiptracing Mild High Club",
                    Why: "Si te gustan los acordes raros de Crumb, aquí hay muchos más."),
            ]),
        ]),
    ];

    private static readonly (string From, string Artist)[] DemoRequests = [("carla", "Cráneo"), ("pablo", "Los Secretos")];

    public async Task SeedRutasAsync()
    {
        if (await db.Rutas.AnyAsync()) return;
        var demoUsers = await db.Users.Where(u => u.SpotifyId.StartsWith(DemoPrefix)).ToListAsync();
        if (demoUsers.Count == 0) return;
        User? Find(string key) => demoUsers.FirstOrDefault(u => u.SpotifyId == DemoPrefix + key);

        var json = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        var now = DateTime.UtcNow;
        foreach (var (r, i) in DemoRutas.Select((r, i) => (r, i)))
        {
            var author = Find(r.Author);
            if (author is null) continue;
            var branches = new List<RutaBranch>();
            var first = true;
            foreach (var b in r.Branches)
            {
                var branch = new RutaBranch { Label = b.Label, BridgeLead = b.BridgeLead, Bridge = b.Bridge };
                foreach (var n in b.Nodes)
                {
                    var album = await LookupAlbumAsync(n.Query);
                    branch.Nodes.Add(new RutaNode
                    {
                        Id = Guid.NewGuid().ToString("N")[..10],
                        SpotifyId = album?.Id,
                        ItemType = "album",
                        Title = n.Title,
                        Artist = n.Artist,
                        Year = album?.Year,
                        ImageUrl = album?.Image,
                        IsStart = first,
                        Lead = n.Lead,
                        LeadText = n.LeadText,
                        EdgeLead = n.EdgeLead,
                        Edge = n.Edge,
                        Why = n.Why,
                    });
                    first = false;
                }
                branches.Add(branch);
            }
            db.Rutas.Add(new Ruta
            {
                Id = Guid.NewGuid(),
                Title = r.Title,
                Intro = r.Intro,
                AuthorId = author.Id,
                ArtistName = r.ArtistName,
                ArtistSpotifyId = (await FindArtistAsync(r.ArtistName))?.Id,
                BranchesJson = JsonSerializer.Serialize(branches, json),
                CreatedAt = now.AddDays(-3 - i),
                UpdatedAt = now.AddDays(-3 - i),
            });
        }

        foreach (var (from, artist) in DemoRequests)
        {
            var user = Find(from);
            if (user is null) continue;
            db.RutaRequests.Add(new RutaRequest { Id = Guid.NewGuid(), FromUserId = user.Id, ArtistName = artist, CreatedAt = now.AddDays(-1) });
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Demo: sembradas las rutas de escucha");
    }

    // Disco en Spotify: id, portada y año de salida
    private async Task<(string Id, string? Image, string? Year)?> LookupAlbumAsync(string query)
    {
        try
        {
            var found = await SearchFirstAsync("album", query);
            if (found is not JsonElement a) return null;
            var date = a.TryGetProperty("release_date", out var d) ? d.GetString() : null;
            return (a.GetProperty("id").GetString()!, FirstImage(a), date is { Length: >= 4 } ? date[..4] : null);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Demo: no se encontró el disco {Query}", query);
            return null;
        }
    }
}
