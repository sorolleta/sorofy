namespace SameSpot.Api.Config;

// Lista cerrada de provincias: la proximidad local comparará por igualdad
// exacta, así que no puede ser texto libre ("Valencia" vs "valencia" vs "Vlc").
public static class SpainProvinces
{
    public static readonly string[] All =
    [
        "A Coruña", "Álava", "Albacete", "Alicante", "Almería", "Asturias",
        "Ávila", "Badajoz", "Barcelona", "Bizkaia", "Burgos", "Cáceres",
        "Cádiz", "Cantabria", "Castellón", "Ceuta", "Ciudad Real", "Córdoba",
        "Cuenca", "Gipuzkoa", "Girona", "Granada", "Guadalajara", "Huelva",
        "Huesca", "Illes Balears", "Jaén", "La Rioja", "Las Palmas", "León",
        "Lleida", "Lugo", "Madrid", "Málaga", "Melilla", "Murcia", "Navarra",
        "Ourense", "Palencia", "Pontevedra", "Salamanca",
        "Santa Cruz de Tenerife", "Segovia", "Sevilla", "Soria", "Tarragona",
        "Teruel", "Toledo", "Valencia", "Valladolid", "Zamora", "Zaragoza",
    ];

    public static bool IsValid(string province) => All.Contains(province);
}
