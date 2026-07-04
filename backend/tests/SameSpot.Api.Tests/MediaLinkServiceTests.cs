using SameSpot.Api.Services;
using Xunit;

namespace SameSpot.Api.Tests;

public class MediaLinkServiceTests
{
    [Theory]
    [InlineData("https://www.youtube.com/watch?v=abc123")]
    [InlineData("https://youtu.be/abc123")]
    [InlineData("https://music.youtube.com/watch?v=abc123")]
    [InlineData("youtube.com/watch?v=abc123")] // sin esquema también vale
    [InlineData("http://www.youtube.com/watch?v=abc123")] // http se normaliza
    public void EnlacesDeYoutubeValidos(string url) =>
        Assert.True(MediaLinkService.IsYoutubeUrl(url));

    [Theory]
    [InlineData("https://soundcloud.com/charanga/directo")]
    [InlineData("https://on.soundcloud.com/xyz")]
    public void EnlacesDeSoundcloudValidos(string url) =>
        Assert.True(MediaLinkService.IsSoundcloudUrl(url));

    [Theory]
    [InlineData("https://youtube.evil.com/watch?v=abc")] // subdominio impostor
    [InlineData("https://vimeo.com/12345")] // otra plataforma
    [InlineData("https://soundcloud.com/pista")] // SoundCloud no es YouTube
    [InlineData("no es una url")]
    [InlineData("")]
    public void EnlacesQueNoSonDeYoutube(string url) =>
        Assert.False(MediaLinkService.IsYoutubeUrl(url));

    [Theory]
    [InlineData("https://www.youtube.com/watch?v=abc")] // YouTube no es SoundCloud
    [InlineData("https://misoundcloud.com/pista")] // dominio impostor
    public void EnlacesQueNoSonDeSoundcloud(string url) =>
        Assert.False(MediaLinkService.IsSoundcloudUrl(url));
}
