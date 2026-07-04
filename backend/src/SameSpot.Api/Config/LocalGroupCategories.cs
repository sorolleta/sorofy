namespace SameSpot.Api.Config;

// Lista cerrada, como las provincias: los filtros y badges del feed
// comparan por igualdad exacta
public static class LocalGroupCategories
{
    public static readonly string[] All =
    [
        "Charanga",
        "Banda de música",
        "Orquesta de verbena",
        "Grupo",
        "Solista",
        "DJ / Colectivo",
        "Coro y rondalla",
    ];

    public static bool IsValid(string category) => All.Contains(category);
}
