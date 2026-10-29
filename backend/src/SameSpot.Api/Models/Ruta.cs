namespace SameSpot.Api.Models;

// Una ruta de escucha («Por dónde empezar»): el mapa de discos que alguien
// hace para enseñar cómo entrar en un artista. Ramas = filas del mapa, cada
// una con sus paradas (discos) en orden y el motivo de cada flecha. Sin
// estrellas ni notas: solo el porqué de quien la hizo.
//
// Las ramas se guardan como JSON en la propia fila: se leen y se editan
// siempre enteras (el editor guarda la ruta completa), nunca por separado.
public class Ruta
{
    public Guid Id { get; set; }
    public required string Title { get; set; }
    public string? Intro { get; set; }
    public Guid AuthorId { get; set; }
    public User Author { get; set; } = null!;
    // El artista de la ruta: la ficha de artista la busca por aquí
    public required string ArtistName { get; set; }
    public string? ArtistSpotifyId { get; set; }
    public string BranchesJson { get; set; } = "[]";
    // "Hacer la mía": de qué ruta salió esta copia
    public Guid? ForkedFromId { get; set; }
    // Si responde a una petición «¿por dónde empiezo con X?»
    public Guid? AnswersRequestId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

// Contenido de BranchesJson
public class RutaBranch
{
    public string Label { get; set; } = "";
    // Puente hacia la rama siguiente: «¿Te ha gustado? Vuelve atrás.» + explicación
    public string? BridgeLead { get; set; }
    public string? Bridge { get; set; }
    public List<RutaNode> Nodes { get; set; } = [];
}

public class RutaNode
{
    public string Id { get; set; } = "";
    // El disco (o canción) en Spotify; nombre y portada se guardan con la
    // ruta para pintar el mapa sin preguntar a Spotify por cada parada
    public string? SpotifyId { get; set; }
    public string ItemType { get; set; } = "album";
    public string Title { get; set; } = "";
    public string? Artist { get; set; }
    public string? Year { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsStart { get; set; }
    // Solo en la parada de inicio: «Empieza aquí.» + texto
    public string? Lead { get; set; }
    public string? LeadText { get; set; }
    // Motivo de la flecha hacia la SIGUIENTE parada de la rama
    public string? EdgeLead { get; set; }
    public string? Edge { get; set; }
    // El porqué del panel de detalle
    public string? Why { get; set; }
}

// Paradas que alguien ha marcado como escuchadas. Privado: solo lo ve esa persona.
public class RutaProgress
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public Guid RutaId { get; set; }
    public Ruta Ruta { get; set; } = null!;
    public required string NodeId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// Guardar una ruta de otra persona para volver a ella
public class RutaSave
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public Guid RutaId { get; set; }
    public Ruta Ruta { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// «¿Por dónde empiezo con X?»: se lo pides a tu gente y alguien responde con una ruta
public class RutaRequest
{
    public Guid Id { get; set; }
    public Guid FromUserId { get; set; }
    public User FromUser { get; set; } = null!;
    public required string ArtistName { get; set; }
    public string? ArtistSpotifyId { get; set; }
    public Guid? AnsweredByRutaId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
