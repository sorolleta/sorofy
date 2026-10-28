using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SameSpot.Api.Models;

namespace SameSpot.Api.Data;

// Rellena la demo con perfiles de ejemplo (sus tops, notas, comentarios,
// listas y grupos locales) para que quien entre no se encuentre la app vacía.
// Se activa con SEED_DEMO=true y solo corre una vez: si ya hay usuarios
// "demo-", no hace nada. Las canciones se buscan en Spotify con las
// credenciales de la app para que tengan carátula e id reales.
public class DemoSeeder(AppDbContext db, IConfiguration config, ILogger<DemoSeeder> logger)
{
    private const string DemoPrefix = "demo-";
    private readonly HttpClient _http = new();
    private readonly Dictionary<string, MusicItem> _items = [];
    private readonly Dictionary<string, (string Id, string? Image)?> _artists = [];
    private string? _token;
    private readonly DateTime _now = DateTime.UtcNow;

    private record DemoUser(string Key, string Name, string Province, string[] Tags, string[] Genres,
        string[] Artists, (string Track, string Artist)[] Tracks);

    // Qué es la nota: canción, disco, artista o grupo local
    private record Ref(MusicItemType Type, string Name, string? Artist = null);

    private record DemoNote(string Key, string Author, Ref Item, string? Text, int DaysAgo,
        int Vibe = -1, string? Label = null, string? Emoji = null, string? Anchor = null);

    private static Ref T(string name, string artist) => new(MusicItemType.Track, name, artist);
    private static Ref A(string name, string artist) => new(MusicItemType.Album, name, artist);
    private static Ref Ar(string name) => new(MusicItemType.Artist, name);
    private static Ref G(string name) => new(MusicItemType.LocalGroup, name);

    // Los mismos hex que la paleta del frontend (vibes.ts)
    private static readonly string[] Vibes = ["#f5a623", "#6fa8ff", "#d98fe0", "#ff8a70", "#7fd482", "#efd35d"];

    private static readonly DemoUser[] Users =
    [
        new("lucia", "Lucía Ferrer", "Valencia", ["Indie de carretera", "Pop luminoso"], ["indie español", "pop"],
            ["Vetusta Morla", "Love of Lesbian", "Carolina Durante", "Rigoberta Bandini", "Zahara"],
            [("Copenhague", "Vetusta Morla"), ("Club de fans de John Boy", "Love of Lesbian"), ("Cayetano", "Carolina Durante"), ("Ay mamá", "Rigoberta Bandini")]),
        new("marcos", "Marcos Iglesias", "Madrid", ["Jazz nocturno", "Soul y funk"], ["jazz", "soul"],
            ["Bill Evans", "Chet Baker", "Nina Simone", "Kamasi Washington", "Jorja Smith"],
            [("My Funny Valentine", "Chet Baker"), ("Waltz for Debby", "Bill Evans"), ("Feeling Good", "Nina Simone"), ("Blue Lights", "Jorja Smith")]),
        new("ainhoa", "Ainhoa Etxeberria", "Gipuzkoa", ["Post-punk", "Metal y ruido"], ["post-punk", "rock"],
            ["Fontaines D.C.", "Joy Division", "IDLES", "Berri Txarrak", "The Cure"],
            [("Boys in the Better Land", "Fontaines D.C."), ("Love Will Tear Us Apart", "Joy Division"), ("Never Fight a Man With a Perm", "IDLES"), ("Just Like Heaven", "The Cure")]),
        new("javi", "Javi Moreno", "Sevilla", ["Flamenco y raíz", "Cantautor e íntimo"], ["flamenco", "cantautor"],
            ["Camarón de la Isla", "Rosalía", "Paco de Lucía", "Silvia Pérez Cruz", "Niño de Elche"],
            [("La leyenda del tiempo", "Camarón de la Isla"), ("Malamente", "Rosalía"), ("Entre dos aguas", "Paco de Lucía"), ("Vestida de nit", "Silvia Pérez Cruz")]),
        new("nerea", "Nerea Castro", "A Coruña", ["Electrónica de baile", "Ambient y calma"], ["electronic", "ambient"],
            ["Bonobo", "Four Tet", "Caribou", "Fred again..", "Aphex Twin"],
            [("Kerala", "Bonobo"), ("Baby", "Four Tet"), ("Can't Do Without You", "Caribou"), ("Avril 14th", "Aphex Twin")]),
        new("pablo", "Pablo Ruiz", "Zaragoza", ["Rock clásico", "Folk y acústico"], ["rock", "folk"],
            ["Fleetwood Mac", "Héroes del Silencio", "Bob Dylan", "Led Zeppelin", "Bunbury"],
            [("Dreams", "Fleetwood Mac"), ("Entre dos tierras", "Héroes del Silencio"), ("Like a Rolling Stone", "Bob Dylan"), ("Going to California", "Led Zeppelin")]),
        new("carla", "Carla Vidal", "Barcelona", ["Hip-hop y rap", "Reggaetón y perreo"], ["hip hop", "urbano"],
            ["Kendrick Lamar", "Bad Bunny", "Bad Gyal", "Nathy Peluso", "Kase.O"],
            [("Money Trees", "Kendrick Lamar"), ("Tití Me Preguntó", "Bad Bunny"), ("Fiebre", "Bad Gyal"), ("Sana Sana", "Nathy Peluso")]),
        new("dani", "Dani Soler", "Valencia", ["Charanga y fiesta", "Pop luminoso"], ["rumba", "pop"],
            ["El Último de la Fila", "Estopa", "La Pegatina", "Rigoberta Bandini", "Muchachito Bombo Infierno"],
            [("Como un burro amarrado en la puerta del baile", "El Último de la Fila"), ("Como Camarón", "Estopa"), ("Lloverá y yo veré", "La Pegatina"), ("Ay mamá", "Rigoberta Bandini")]),
        new("irene", "Irene Navarro", "Granada", ["Cantautor e íntimo", "Folk y acústico"], ["cantautor", "folk"],
            ["Jorge Drexler", "Phoebe Bridgers", "Bon Iver", "Sufjan Stevens", "Silvia Pérez Cruz"],
            [("Todo se transforma", "Jorge Drexler"), ("Motion Sickness", "Phoebe Bridgers"), ("Holocene", "Bon Iver"), ("Mystery of Love", "Sufjan Stevens")]),
        new("hugo", "Hugo Martín", "Madrid", ["Clásica y bandas sonoras", "Ambient y calma"], ["neoclassical", "ambient"],
            ["Max Richter", "Nils Frahm", "Ólafur Arnalds", "Ludovico Einaudi", "Hans Zimmer"],
            [("On the Nature of Daylight", "Max Richter"), ("Says", "Nils Frahm"), ("Experience", "Ludovico Einaudi"), ("Time", "Hans Zimmer")]),
    ];

    private static readonly (string Name, string Category, string Province, string Creator, string Description, string Repertoire, string[] Followers)[] Groups =
    [
        ("Xaranga La Gresca", "Charanga", "Valencia", "dani",
            "Doce músicos de Benimaclet que tocan en cualquier fiesta que les dejen. Famosos por no parar nunca.",
            "Paquito el chocolatero, Como un burro amarrado, Sarandonga, Fiesta pagana", ["lucia", "dani"]),
        ("Orquesta Vendaval", "Orquesta de verbena", "Zaragoza", "pablo",
            "La orquesta de las fiestas del barrio desde hace veinte años. Luces de los 90 y un repertorio que no perdona.",
            "Entre dos tierras, Mi gran noche, Sarandonga, Paquito el chocolatero", ["pablo", "ainhoa"]),
        ("Rondalla del Realejo", "Coro y rondalla", "Granada", "irene",
            "Rondalla de vecinos del Realejo. Ensayan los jueves y cantan donde les invitan.",
            "Clavelitos, Granada, La Tarara, Cielito lindo", ["irene", "javi"]),
    ];

    private static readonly DemoNote[] Notes =
    [
        new("copenhague", "lucia", T("Copenhague", "Vetusta Morla"),
            "La puse en el coche volviendo de Teruel a las tantas y acabamos los cuatro cantándola a gritos. Hay canciones que ya no son mías, son de esa noche.",
            4, 1, "Carretera nocturna", "🌙"),
        new("mapas", "lucia", A("Mapas", "Vetusta Morla"),
            "Años después sigo descubriendo detalles en este disco. Hoy ha sido el bajo de «Golpe maestro». Disco de auriculares, sin prisa.", 12),
        new("aymama", "lucia", T("Ay mamá", "Rigoberta Bandini"),
            "Si te gusta Carolina Durante y no le has dado una oportunidad a Rigoberta por prejuicio, hazlo. En directo es una catarsis colectiva.",
            2, Anchor: "Carolina Durante"),
        new("village", "marcos", A("Sunday at the Village Vanguard", "Bill Evans"),
            "Se oyen los vasos y la gente hablando al fondo. Me encanta que no lo limpiaran: es como estar en la última mesa un domingo de 1961.",
            6, 5, "Domingo lento", "☕"),
        new("feelinggood", "marcos", T("Feeling Good", "Nina Simone"),
            "La pongo cada vez que cierro un proyecto. Ese «it's a new dawn» es mi ritual de fin de semana.", 1),
        new("bluelights", "marcos", T("Blue Lights", "Jorja Smith"),
            "Si echas de menos a Amy, Jorja tiene esa misma forma de cantar como si te lo contara solo a ti.",
            9, Anchor: "Amy Winehouse"),
        new("boys", "ainhoa", T("Boys in the Better Land", "Fontaines D.C."),
            "Primera canción que puse cuando me dieron las llaves del piso. Guitarras sucias para paredes vacías.",
            3, 3, "Para gritar", "🔥"),
        new("berri", "ainhoa", Ar("Berri Txarrak"),
            "Les vi en la gira de despedida y todavía me tiembla algo por dentro cuando vuelvo a «Payola». Nadie ha sonado así de fuerte en euskera.", 15),
        new("lovewill", "ainhoa", T("Love Will Tear Us Apart", "Joy Division"), null, 7, 1, "Lunes gris", "🌧️"),
        new("malquerer", "javi", A("El Mal Querer", "Rosalía"),
            "Me costó entrarle, lo reconozco. Venía del flamenco de mi abuelo y esto me parecía un disfraz. Hoy creo que es de los discos más valientes que se han hecho aquí.", 10),
        new("leyenda", "javi", T("La leyenda del tiempo", "Camarón de la Isla"),
            "Mi padre dice que cuando salió nadie la entendió. Yo la pongo cada vez que alguien me dice que el flamenco es de viejos.",
            2, Anchor: "Rosalía"),
        new("dosaguas", "javi", T("Entre dos aguas", "Paco de Lucía"),
            "Sábado, gazpacho y esto sonando.", 5, 4, "Cocina con ventana abierta", "🌿"),
        new("kerala", "nerea", T("Kerala", "Bonobo"),
            "Perfecta para el tramo de bici por el paseo marítimo a las ocho, cuando todavía no hay nadie.", 1, 0, "Amanecer", "🌅"),
        new("ourlove", "nerea", A("Our Love", "Caribou"),
            "Disco de llorar bailando. «Can't Do Without You» repite la frase como un mantra hasta que te la crees.",
            8, Anchor: "Four Tet"),
        new("avril", "nerea", T("Avril 14th", "Aphex Twin"), "Dos minutos. No necesita más.", 13, 2, "Para dormir", "💤"),
        new("rumours", "pablo", A("Rumours", "Fleetwood Mac"),
            "Lo grabaron mientras se separaban entre ellos y suena a eso: gente que se quiere y se odia a la vez. Lo heredé en vinilo de mi tío.", 11),
        new("dostierras", "pablo", T("Entre dos tierras", "Héroes del Silencio"),
            "Zaragoza, mi hermano mayor con la cinta en el coche. Ese riff es la banda sonora de mi infancia.", 4, 3, "Para gritar", "🔥"),
        new("rolling", "pablo", T("Like a Rolling Stone", "Bob Dylan"), "Seis minutos y no sobra ni uno.", 17),
        new("vendaval", "pablo", G("Orquesta Vendaval"),
            "Este año en las fiestas se marcaron un popurrí de Héroes que no esperaba nadie. Media plaza cantando.", 6),
        new("moneytrees", "carla", T("Money Trees", "Kendrick Lamar"),
            "Esa base es humo. La pongo de fondo para estudiar y acabo sin estudiar nada.", 2, 2, "Madrugada", "🌃"),
        new("verano", "carla", A("Un Verano Sin Ti", "Bad Bunny"),
            "Odio admitir que este disco me hizo el verano. Hay más variedad de la que parece: «Ojitos Lindos» con Bomba Estéreo es una joya.", 14),
        new("fiebre", "carla", T("Fiebre", "Bad Gyal"),
            "Si te gusta Bad Bunny pero quieres algo de aquí, Bad Gyal lleva años haciendo esto antes que nadie.",
            6, Anchor: "Bad Bunny"),
        new("burro", "dani", T("Como un burro amarrado en la puerta del baile", "El Último de la Fila"),
            "La toca la charanga del pueblo cada agosto a las cinco de la mañana y no hay nadie que no la cante. Patrimonio.",
            3, 0, "Fiesta de pueblo", "🎺"),
        new("llovera", "dani", T("Lloverá y yo veré", "La Pegatina"),
            "Para fregar los platos después de una paella de veinte personas. Probado.", 9),
        new("gresca", "dani", G("Xaranga La Gresca"),
            "Ayer en las fiestas tocaron hasta que les cortaron la luz. Siguieron igual, a pulmón.", 1),
        new("transforma", "irene", T("Todo se transforma", "Jorge Drexler"),
            "Me la enseñó mi profesora de guitarra y desde entonces pienso en ella cada vez que presto un libro.", 5, 4, "Domingo lento", "🍃"),
        new("emma", "irene", A("For Emma, Forever Ago", "Bon Iver"),
            "Lo grabó solo en una cabaña en invierno, y se nota el frío. Disco para noviembre.",
            12, Anchor: "Sufjan Stevens"),
        new("motion", "irene", T("Motion Sickness", "Phoebe Bridgers"), "La rabia más bonita que conozco.", 2),
        new("rondalla", "irene", G("Rondalla del Realejo"),
            "Cantaron en la placeta un viernes de mayo. Gente mayor, gente joven y un perro que se puso a aullar en el estribillo.", 7),
        new("daylight", "hugo", T("On the Nature of Daylight", "Max Richter"),
            "No puedo con ella sin que se me caiga algo. La guardo para los días que la merecen.", 3, 1, "Para llorar un poco", "💧"),
        new("says", "hugo", T("Says", "Nils Frahm"),
            "Ocho minutos de ir subiendo. Ideal para escribir: a la mitad ya no sabes si la escuchas o estás dentro.",
            10, Anchor: "Ólafur Arnalds"),
        new("time", "hugo", T("Time", "Hans Zimmer"),
            "La pongo antes de los exámenes. Es un ritual tonto, pero me calma.", 16),
    ];

    // (nota, autor, texto, índice del comentario de esa nota al que responde)
    private static readonly (string Note, string Author, string Text, int? ReplyTo)[] Comments =
    [
        ("copenhague", "dani", "Esa canción en coche es otra cosa. ¿Qué tramo de carretera era?", null),
        ("copenhague", "lucia", "La subida de Sarrión, con niebla 😅", 0),
        ("copenhague", "irene", "Me has hecho ponerla ahora mismo.", null),
        ("village", "hugo", "Lo de los vasos es lo mejor del disco.", null),
        ("village", "marcos", "¡Por fin alguien que lo entiende!", 0),
        ("malquerer", "carla", "A mí me pasó igual. «Bagdad» me rompió.", null),
        ("malquerer", "irene", "Valiente es la palabra.", null),
        ("leyenda", "pablo", "Tu padre tiene razón, y aun así hoy es un clásico.", null),
        ("kerala", "hugo", "Bonobo para la bici es un acierto. Prueba «Cirrus» también.", null),
        ("kerala", "nerea", "Apuntada para mañana.", 0),
        ("rumours", "lucia", "Heredar ese vinilo es ganar la lotería.", null),
        ("dostierras", "ainhoa", "Ese riff lo aprendí antes que a atarme los zapatos.", null),
        ("burro", "lucia", "Confirmo. En Valencia pasa igual.", null),
        ("burro", "pablo", "¡En Zaragoza también!", null),
        ("moneytrees", "marcos", "El sample de esa base es precioso.", null),
        ("daylight", "irene", "Me pasa exactamente lo mismo.", null),
        ("daylight", "nerea", "Esta y «Avril 14th» en bucle toda la tarde.", null),
        ("motion", "ainhoa", "La rabia más bonita. Lo suscribo.", null),
        ("gresca", "lucia", "¡Estuve! Lo de la luz fue épico.", null),
        ("boys", "pablo", "En directo me parecieron otra banda, mucho más bestia.", null),
    ];

    private static readonly (string Follower, string[] Following)[] Follows =
    [
        ("lucia", ["dani", "irene", "ainhoa", "pablo"]),
        ("dani", ["lucia", "pablo", "javi"]),
        ("irene", ["javi", "hugo", "lucia"]),
        ("javi", ["irene", "carla", "pablo"]),
        ("marcos", ["hugo", "irene", "carla"]),
        ("hugo", ["marcos", "nerea", "irene"]),
        ("nerea", ["hugo", "carla", "ainhoa"]),
        ("carla", ["nerea", "javi", "marcos"]),
        ("ainhoa", ["pablo", "nerea", "lucia"]),
        ("pablo", ["ainhoa", "dani", "marcos"]),
    ];

    private static readonly (string Title, string Mood, string Curator, (Ref Item, string By, string Why)[] Items, string[] SavedBy)[] Listas =
    [
        ("Para conducir de noche sin prisa", "Ventanilla bajada y ni un alma en la carretera", "lucia",
        [
            (T("Copenhague", "Vetusta Morla"), "lucia", "La que empezó todo."),
            (T("Kerala", "Bonobo"), "nerea", "Hace que la carretera parezca que flota."),
            (T("Dreams", "Fleetwood Mac"), "pablo", "Fleetwood siempre funciona de noche."),
            (T("Holocene", "Bon Iver"), "irene", "Para cuando ya se ven las luces del pueblo."),
        ], ["dani", "nerea", "irene"]),
        ("Domingos de café", "Para la mañana en la que no tienes que ir a ningún sitio", "marcos",
        [
            (T("My Funny Valentine", "Chet Baker"), "marcos", "Chet a primera hora es otra cosa."),
            (T("Todo se transforma", "Jorge Drexler"), "irene", "Para leer en el sofá."),
            (T("Says", "Nils Frahm"), "hugo", "Por si el café se alarga."),
            (T("Avril 14th", "Aphex Twin"), "nerea", "Dos minutos de calma."),
        ], ["hugo", "irene"]),
        ("Gritar en el coche", "Cuando hace falta soltarlo todo", "ainhoa",
        [
            (T("Boys in the Better Land", "Fontaines D.C."), "ainhoa", "Ventanillas arriba, por los vecinos."),
            (T("Entre dos tierras", "Héroes del Silencio"), "pablo", "Obligatoria."),
            (T("Motion Sickness", "Phoebe Bridgers"), "irene", "Rabia bonita."),
            (T("Lloverá y yo veré", "La Pegatina"), "dani", "Para acabar riéndote."),
        ], ["pablo", "lucia", "carla"]),
    ];

    public async Task SeedAsync()
    {
        if (await db.Users.AnyAsync(u => u.SpotifyId.StartsWith(DemoPrefix)))
        {
            logger.LogInformation("Demo: ya sembrada, nada que hacer");
            return;
        }

        var tags = await db.Tags.ToListAsync();
        var users = new Dictionary<string, User>();

        foreach (var (u, i) in Users.Select((u, i) => (u, i)))
        {
            var user = new User
            {
                Id = Guid.NewGuid(),
                SpotifyId = DemoPrefix + u.Key,
                DisplayName = u.Name,
                AvatarUrl = $"https://api.dicebear.com/9.x/notionists/svg?seed={Uri.EscapeDataString(u.Name)}&backgroundColor={Vibes[i % Vibes.Length][1..]}",
                Province = u.Province,
                CreatedAt = _now.AddDays(-30 + i),
                OnboardingCompletedAt = _now.AddDays(-30 + i),
                Tags = tags.Where(t => u.Tags.Contains(t.Name)).ToList(),
            };

            for (var r = 0; r < u.Artists.Length; r++)
            {
                var artist = await FindArtistAsync(u.Artists[r]);
                user.TopArtists.Add(new TopArtist
                {
                    SpotifyArtistId = artist?.Id ?? $"{DemoPrefix}{Slug(u.Artists[r])}",
                    Name = u.Artists[r],
                    Genres = [.. u.Genres],
                    ImageUrl = artist?.Image,
                    Rank = r + 1,
                    FetchedAt = _now,
                });
            }

            for (var r = 0; r < u.Tracks.Length; r++)
            {
                var (name, artistName) = u.Tracks[r];
                var item = await GetItemAsync(T(name, artistName), null);
                user.TopTracks.Add(new TopTrack
                {
                    SpotifyTrackId = item.SpotifyId!,
                    Name = item.Name,
                    ArtistName = item.ArtistName ?? artistName,
                    ImageUrl = item.ImageUrl,
                    AlbumSpotifyId = _albumOfTrack.GetValueOrDefault(item.SpotifyId!).Id,
                    AlbumName = _albumOfTrack.GetValueOrDefault(item.SpotifyId!).Name,
                    Rank = r + 1,
                    FetchedAt = _now,
                });
            }

            users[u.Key] = user;
            db.Users.Add(user);
        }

        foreach (var g in Groups)
        {
            var group = new MusicItem
            {
                Id = Guid.NewGuid(),
                Type = MusicItemType.LocalGroup,
                Name = g.Name,
                Description = g.Description,
                Category = g.Category,
                Province = g.Province,
                Repertoire = g.Repertoire,
                CreatedByUserId = users[g.Creator].Id,
                CreatedAt = _now.AddDays(-25),
            };
            _items[Key(G(g.Name))] = group;
            db.MusicItems.Add(group);
            foreach (var f in g.Followers)
            {
                db.Set<GroupFollow>().Add(new GroupFollow { UserId = users[f].Id, MusicItemId = group.Id, CreatedAt = _now.AddDays(-20) });
            }
        }

        foreach (var (follower, following) in Follows)
        {
            foreach (var f in following)
            {
                db.Set<Follow>().Add(new Follow { FollowerId = users[follower].Id, FollowingId = users[f].Id, CreatedAt = _now.AddDays(-20) });
            }
        }

        // Pseudoaleatorio con semilla fija: los likes salen siempre iguales
        var random = new Random(42);
        var notes = new Dictionary<string, Note>();
        foreach (var n in Notes)
        {
            var item = await GetItemAsync(n.Item, users[n.Author].Id);
            var anchor = n.Anchor is null ? null : await FindArtistAsync(n.Anchor);
            var createdAt = _now.AddDays(-n.DaysAgo).AddHours(-random.Next(0, 12));
            var note = new Note
            {
                Id = Guid.NewGuid(),
                UserId = users[n.Author].Id,
                MusicItemId = item.Id,
                Text = n.Text,
                VibeColor = n.Vibe >= 0 ? Vibes[n.Vibe] : null,
                VibeEmoji = n.Vibe >= 0 ? n.Emoji : null,
                VibeLabel = n.Label,
                AnchorArtistSpotifyId = anchor?.Id,
                AnchorArtistName = anchor is null ? null : n.Anchor,
                CreatedAt = createdAt,
            };
            notes[n.Key] = note;
            db.Set<Note>().Add(note);

            var likers = Users.Select(u => u.Key).Where(k => k != n.Author)
                .OrderBy(_ => random.Next()).Take(random.Next(1, 6));
            foreach (var l in likers)
            {
                db.Set<NoteLike>().Add(new NoteLike { NoteId = note.Id, UserId = users[l].Id, CreatedAt = createdAt.AddHours(random.Next(1, 30)) });
            }
        }

        var commentsByNote = new Dictionary<string, List<NoteComment>>();
        foreach (var c in Comments)
        {
            var list = commentsByNote.TryGetValue(c.Note, out var existing) ? existing : commentsByNote[c.Note] = [];
            var note = notes[c.Note];
            var comment = new NoteComment
            {
                Id = Guid.NewGuid(),
                NoteId = note.Id,
                UserId = users[c.Author].Id,
                ParentCommentId = c.ReplyTo is int parent ? list[parent].Id : null,
                Text = c.Text,
                CreatedAt = note.CreatedAt.AddHours(2 + list.Count * 3),
            };
            list.Add(comment);
            db.Set<NoteComment>().Add(comment);
        }

        foreach (var l in Listas)
        {
            var lista = new Lista
            {
                Id = Guid.NewGuid(),
                Title = l.Title,
                Mood = l.Mood,
                CuratorId = users[l.Curator].Id,
                CreatedAt = _now.AddDays(-18),
            };
            foreach (var (refItem, by, why) in l.Items)
            {
                var item = await GetItemAsync(refItem, users[by].Id);
                lista.Items.Add(new ListaItem
                {
                    Id = Guid.NewGuid(),
                    MusicItemId = item.Id,
                    AddedByUserId = users[by].Id,
                    Text = why,
                    CreatedAt = lista.CreatedAt.AddDays(lista.Items.Count + 1),
                });
            }
            db.Set<Lista>().Add(lista);
            foreach (var s in l.SavedBy)
            {
                db.Set<ListaSave>().Add(new ListaSave { UserId = users[s].Id, ListaId = lista.Id, CreatedAt = _now.AddDays(-10) });
            }
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Demo: sembrados {Users} usuarios y {Notes} notas", users.Count, notes.Count);
    }

    // ---- Spotify: búsquedas con el token de la app (client credentials) ----

    private readonly Dictionary<string, (string? Id, string? Name)> _albumOfTrack = [];

    private async Task<MusicItem> GetItemAsync(Ref r, Guid? createdBy)
    {
        var key = Key(r);
        if (_items.TryGetValue(key, out var cached)) return cached;

        string? spotifyId = null, name = r.Name, artist = r.Artist, image = null;
        try
        {
            switch (r.Type)
            {
                case MusicItemType.Track:
                    var track = await SearchFirstAsync("track", $"track:{r.Name} artist:{r.Artist}");
                    if (track is JsonElement t)
                    {
                        spotifyId = t.GetProperty("id").GetString();
                        name = t.GetProperty("name").GetString() ?? r.Name;
                        artist = JoinArtists(t);
                        var album = t.GetProperty("album");
                        image = FirstImage(album);
                        _albumOfTrack[spotifyId!] = (album.GetProperty("id").GetString(), album.GetProperty("name").GetString());
                    }
                    break;
                case MusicItemType.Album:
                    var found = await SearchFirstAsync("album", $"album:{r.Name} artist:{r.Artist}");
                    if (found is JsonElement a)
                    {
                        spotifyId = a.GetProperty("id").GetString();
                        name = a.GetProperty("name").GetString() ?? r.Name;
                        artist = JoinArtists(a);
                        image = FirstImage(a);
                    }
                    break;
                case MusicItemType.Artist:
                    var ar = await FindArtistAsync(r.Name);
                    (spotifyId, image) = (ar?.Id, ar?.Image);
                    break;
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Demo: no se pudo buscar {Item} en Spotify", key);
        }

        spotifyId ??= DemoPrefix + Slug(key);
        var existing = await db.MusicItems.FirstOrDefaultAsync(i => i.Type == r.Type && i.SpotifyId == spotifyId);
        var item = existing ?? new MusicItem
        {
            Id = Guid.NewGuid(),
            Type = r.Type,
            SpotifyId = spotifyId,
            Name = name,
            ArtistName = r.Type == MusicItemType.Artist ? null : artist,
            ImageUrl = image,
            CreatedAt = _now.AddDays(-28),
        };
        if (existing is null) db.MusicItems.Add(item);
        _items[key] = item;
        if (spotifyId.StartsWith(DemoPrefix)) _albumOfTrack.TryAdd(spotifyId, (null, null));
        return item;
    }

    private async Task<(string Id, string? Image)?> FindArtistAsync(string name)
    {
        if (_artists.TryGetValue(name, out var cached)) return cached;
        (string, string?)? result = null;
        try
        {
            var found = await SearchFirstAsync("artist", $"artist:{name}", name);
            if (found is JsonElement a) result = (a.GetProperty("id").GetString()!, FirstImage(a));
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Demo: no se pudo buscar el artista {Artist}", name);
        }
        return _artists[name] = result;
    }

    // Primer resultado de la búsqueda; si se pasa exactName, prefiere el que coincide
    private async Task<JsonElement?> SearchFirstAsync(string type, string query, string? exactName = null)
    {
        var token = await GetTokenAsync();
        if (token is null) return null;

        using var request = new HttpRequestMessage(HttpMethod.Get,
            $"https://api.spotify.com/v1/search?q={Uri.EscapeDataString(query)}&type={type}&limit=5&market=ES");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using var response = await _http.SendAsync(request);
        if (!response.IsSuccessStatusCode) return null;

        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var items = json.RootElement.GetProperty(type + "s").GetProperty("items")
            .EnumerateArray().Where(e => e.ValueKind == JsonValueKind.Object).ToList();
        if (items.Count == 0) return null;
        var match = exactName is null ? items[0]
            : items.FirstOrDefault(e => string.Equals(e.GetProperty("name").GetString(), exactName, StringComparison.OrdinalIgnoreCase), items[0]);
        return match.Clone();
    }

    private async Task<string?> GetTokenAsync()
    {
        if (_token is not null) return _token;
        var id = config["SPOTIFY_CLIENT_ID"];
        var secret = config["SPOTIFY_CLIENT_SECRET"];
        if (string.IsNullOrEmpty(id) || string.IsNullOrEmpty(secret)) return null;

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://accounts.spotify.com/api/token")
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string> { ["grant_type"] = "client_credentials" }),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic",
            Convert.ToBase64String(Encoding.UTF8.GetBytes($"{id}:{secret}")));
        using var response = await _http.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Demo: Spotify no dio token de app ({Status}); se siembra sin carátulas", response.StatusCode);
            return _token = null;
        }
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return _token = json.RootElement.GetProperty("access_token").GetString();
    }

    private static string? FirstImage(JsonElement e) =>
        e.TryGetProperty("images", out var images) && images.ValueKind == JsonValueKind.Array && images.GetArrayLength() > 0
            ? images[0].GetProperty("url").GetString()
            : null;

    private static string JoinArtists(JsonElement e) =>
        string.Join(", ", e.GetProperty("artists").EnumerateArray().Select(a => a.GetProperty("name").GetString()));

    private static string Key(Ref r) => $"{r.Type}:{r.Name}:{r.Artist}";

    private static string Slug(string s) =>
        new string(s.ToLowerInvariant().Select(c => char.IsLetterOrDigit(c) ? c : '-').ToArray()).Trim('-');
}
