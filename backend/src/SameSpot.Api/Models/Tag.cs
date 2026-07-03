namespace SameSpot.Api.Models;

// Tag estético del onboarding: describe una sensibilidad musical más que un
// género exacto ("Jazz nocturno", no "jazz"). El catálogo inicial se siembra
// en la migración; ampliarlo es insertar filas, sin tocar código.
public class Tag
{
    public int Id { get; set; }
    public required string Name { get; set; }
}
