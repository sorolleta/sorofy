using SameSpot.Api.Services;
using Xunit;

namespace SameSpot.Api.Tests;

public class MusicAffinityCalculatorTests
{
    private readonly MusicAffinityCalculator _calculator = new();

    private static UserMusicProfile Profile(string[] artists, string[] tracks) =>
        new([.. artists], [.. tracks]);

    [Fact]
    public void GustosIdenticos_Devuelve100()
    {
        var profile = Profile(["a1", "a2"], ["t1", "t2"]);

        var result = _calculator.Calculate(profile, profile);

        Assert.Equal(100, result.Score);
    }

    [Fact]
    public void GustosSinNadaEnComun_Devuelve0()
    {
        var a = Profile(["a1", "a2"], ["t1"]);
        var b = Profile(["a3", "a4"], ["t2"]);

        var result = _calculator.Calculate(a, b);

        Assert.Equal(0, result.Score);
        Assert.Empty(result.CommonArtistIds);
        Assert.Empty(result.CommonTrackIds);
    }

    [Fact]
    public void SolapamientoParcial_PonderaArtistas60Tracks40()
    {
        // Artistas: 2 de 4 en común = 0.5 · Tracks: 1 de 2 en común = 0.5
        // 0.5 * 0.6 + 0.5 * 0.4 = 0.5 → 50%
        var a = Profile(["a1", "a2", "a3", "a4"], ["t1", "t2"]);
        var b = Profile(["a1", "a2", "b3", "b4"], ["t1", "b2"]);

        var result = _calculator.Calculate(a, b);

        Assert.Equal(50, result.Score);
        Assert.Equal(["a1", "a2"], result.CommonArtistIds);
        Assert.Equal(["t1"], result.CommonTrackIds);
    }

    [Fact]
    public void SinDatos_Devuelve0SinPetar()
    {
        var vacio = Profile([], []);

        var result = _calculator.Calculate(vacio, vacio);

        Assert.Equal(0, result.Score);
    }

    [Fact]
    public void TopsDeDistintoTamano_UsaElMasPequenoComoReferencia()
    {
        // El usuario nuevo solo tiene 2 artistas y ambos están en el top del
        // otro: afinidad de artistas 100%, no 2/20.
        var veterano = Profile(["a1", "a2", "a3", "a4", "a5"], []);
        var nuevo = Profile(["a1", "a2"], []);

        var result = _calculator.Calculate(veterano, nuevo);

        Assert.Equal(100, result.Score);
    }

    [Fact]
    public void DimensionSinDatos_RepartesuPesoEntreLasDemas()
    {
        // Sin tracks por ninguna parte: la afinidad es solo la de artistas
        // (1 de 2 en común = 50%), no un 50% penalizado por el peso de tracks.
        var a = Profile(["a1", "a2"], []);
        var b = Profile(["a1", "b2"], []);

        var result = _calculator.Calculate(a, b);

        Assert.Equal(50, result.Score);
    }

    [Fact]
    public void ArtistasDuplicados_NoInflanLaPuntuacion()
    {
        var a = Profile(["a1", "a1", "a2"], []);
        var b = Profile(["a1", "b2"], []);

        var result = _calculator.Calculate(a, b);

        // a1 cuenta una sola vez: 1 en común de min(2, 2) = 50%
        Assert.Equal(50, result.Score);
        Assert.Equal(["a1"], result.CommonArtistIds);
    }

    [Fact]
    public void ComunesConservanElOrdenDelRankingDelPrimerUsuario()
    {
        var a = Profile(["a1", "a2", "a3"], []);
        var b = Profile(["a3", "a1"], []);

        var result = _calculator.Calculate(a, b);

        Assert.Equal(["a1", "a3"], result.CommonArtistIds);
    }
}
