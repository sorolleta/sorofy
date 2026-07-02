using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SameSpot.Api.Config;
using SameSpot.Api.Data;
using SameSpot.Api.Options;
using SameSpot.Api.Repositories;
using SameSpot.Api.Services;

DotEnv.Load();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// Las opciones se leen de variables de entorno planas (.env en local, Docker/hosting en prod)
builder.Services.Configure<SpotifyOptions>(o =>
{
    o.ClientId = builder.Configuration["SPOTIFY_CLIENT_ID"] ?? "";
    o.ClientSecret = builder.Configuration["SPOTIFY_CLIENT_SECRET"] ?? "";
    o.RedirectUri = builder.Configuration["SPOTIFY_REDIRECT_URI"] ?? "";
});
builder.Services.Configure<JwtOptions>(o =>
{
    o.Secret = builder.Configuration["JWT_SECRET"] ?? "";
    o.Issuer = builder.Configuration["JWT_ISSUER"] ?? "";
    o.Audience = builder.Configuration["JWT_AUDIENCE"] ?? "";
});

builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ISpotifyTokenRepository, SpotifyTokenRepository>();
builder.Services.AddScoped<ITopItemsRepository, TopItemsRepository>();
builder.Services.AddScoped<IFollowRepository, FollowRepository>();
builder.Services.AddScoped<SpotifyTokenService>();
builder.Services.AddScoped<FeedService>();
builder.Services.AddSingleton<MusicAffinityCalculator>();
builder.Services.AddScoped<AffinityService>();
builder.Services.AddSingleton<JwtService>();
builder.Services.AddTransient<SpotifyRateLimitHandler>();
builder.Services.AddHttpClient<SpotifyAuthService>();
builder.Services.AddHttpClient<SpotifyApiService>()
    .AddHttpMessageHandler<SpotifyRateLimitHandler>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["JWT_ISSUER"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["JWT_AUDIENCE"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["JWT_SECRET"] ?? "")),
        };
    });

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
