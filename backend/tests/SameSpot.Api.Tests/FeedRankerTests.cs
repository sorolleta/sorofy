using SameSpot.Api.Models;
using SameSpot.Api.Services;
using Xunit;

namespace SameSpot.Api.Tests;

public class FeedRankerTests
{
    private static readonly DateTime Now = new(2026, 7, 3, 12, 0, 0, DateTimeKind.Utc);
    private readonly FeedRanker _ranker = new();

    private static Note NoteFrom(string author, double daysOld = 0) => new()
    {
        Id = Guid.NewGuid(),
        UserId = Guid.NewGuid(),
        MusicItemId = Guid.NewGuid(),
        Text = author,
        CreatedAt = Now.AddDays(-daysOld),
    };

    [Fact]
    public void MismaFrescura_GanaLaAfinidadMasAlta()
    {
        var deConocido = new FeedCandidate(NoteFrom("afin"), 90);
        var deLejano = new FeedCandidate(NoteFrom("lejano"), 10);

        var feed = _ranker.Rank([deLejano, deConocido], [], Now);

        Assert.Equal("afin", feed[0].Text);
        Assert.Equal("lejano", feed[1].Text);
    }

    [Fact]
    public void UnaNotaRecienteSuperaAUnaViejaDeAutorMasAfin()
    {
        // 0.6*0.60 + 0.4*1 = 0.76 frente a 0.6*0.90 + 0.4*(1/8) = 0.59
        var recienteMenosAfin = new FeedCandidate(NoteFrom("reciente"), 60);
        var viejaMuyAfin = new FeedCandidate(NoteFrom("vieja", daysOld: 7), 90);

        var feed = _ranker.Rank([viejaMuyAfin, recienteMenosAfin], [], Now);

        Assert.Equal("reciente", feed[0].Text);
    }

    [Fact]
    public void CadaQuintoHuecoEsDeHorizonte()
    {
        var circle = Enumerable.Range(0, 8)
            .Select(i => new FeedCandidate(NoteFrom($"circulo{i}"), 50))
            .ToList();
        var horizon = new List<HorizonCandidate>
        {
            new(NoteFrom("horizonte1"), MatchesTaste: false),
            new(NoteFrom("horizonte2"), MatchesTaste: false),
        };

        var feed = _ranker.Rank(circle, horizon, Now);

        Assert.Equal(10, feed.Count);
        Assert.StartsWith("horizonte", feed[4].Text);
        Assert.StartsWith("horizonte", feed[9].Text);
        Assert.Equal(8, feed.Count(n => n.Text!.StartsWith("circulo")));
    }

    [Fact]
    public void SinHorizonte_ElCirculoRellenaTodosLosHuecos()
    {
        var circle = Enumerable.Range(0, 6)
            .Select(i => new FeedCandidate(NoteFrom($"circulo{i}"), 50))
            .ToList();

        var feed = _ranker.Rank(circle, [], Now);

        Assert.Equal(6, feed.Count);
        Assert.All(feed, n => Assert.StartsWith("circulo", n.Text!));
    }

    [Fact]
    public void SinCirculo_ElHorizonteHaceDeFeedDeBienvenida()
    {
        var horizon = new List<HorizonCandidate>
        {
            new(NoteFrom("antigua", daysOld: 3), MatchesTaste: false),
            new(NoteFrom("nueva", daysOld: 0), MatchesTaste: false),
        };

        var feed = _ranker.Rank([], horizon, Now);

        Assert.Equal(2, feed.Count);
        Assert.Equal("nueva", feed[0].Text);
        Assert.Equal("antigua", feed[1].Text);
    }

    [Fact]
    public void EnElHorizonte_LaRecomendacionDirigidaGanaAunqueSeaMasVieja()
    {
        var circle = Enumerable.Range(0, 4)
            .Select(i => new FeedCandidate(NoteFrom($"circulo{i}"), 50))
            .ToList();
        var horizon = new List<HorizonCandidate>
        {
            new(NoteFrom("novedad", daysOld: 0), MatchesTaste: false),
            new(NoteFrom("dirigida", daysOld: 5), MatchesTaste: true),
        };

        var feed = _ranker.Rank(circle, horizon, Now);

        // El primer hueco de horizonte (5º) es para la nota anclada a un
        // artista que el lector ya escucha, aunque haya otra más nueva
        Assert.Equal("dirigida", feed[4].Text);
        Assert.Equal("novedad", feed[5].Text);
    }
}
