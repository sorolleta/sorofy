using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SameSpot.Api.Config;
using SameSpot.Api.Data;
using SameSpot.Api.Hubs;
using SameSpot.Api.Options;
using SameSpot.Api.Repositories;
using SameSpot.Api.Services;

DotEnv.Load();

var builder = WebApplication.CreateBuilder(args);

// En Render la BD llega como DATABASE_URL (postgres://user:pass@host:port/db);
// en local y Docker Compose, como ConnectionStrings:Default
var connectionString = builder.Configuration["DATABASE_URL"] is { Length: > 0 } databaseUrl
    ? ConnectionStringFromUrl(databaseUrl)
    : builder.Configuration.GetConnectionString("Default");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

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
builder.Services.AddScoped<IGroupFollowRepository, GroupFollowRepository>();
builder.Services.AddScoped<IListaRepository, ListaRepository>();
builder.Services.AddScoped<IGroupPhotoRepository, GroupPhotoRepository>();
builder.Services.AddScoped<IGroupVideoRepository, GroupVideoRepository>();
builder.Services.AddScoped<IMusicItemRepository, MusicItemRepository>();
builder.Services.AddScoped<INoteRepository, NoteRepository>();
builder.Services.AddScoped<INoteLikeRepository, NoteLikeRepository>();
builder.Services.AddScoped<INoteCommentRepository, NoteCommentRepository>();
builder.Services.AddScoped<IDiscoveryRepository, DiscoveryRepository>();
builder.Services.AddScoped<DiscoveryService>();
builder.Services.AddScoped<MusicItemResolverService>();
builder.Services.AddScoped<IMessageRepository, MessageRepository>();
builder.Services.AddScoped<IConversationReadRepository, ConversationReadRepository>();
builder.Services.AddScoped<ITagRepository, TagRepository>();
builder.Services.AddScoped<SpotifyTokenService>();
builder.Services.AddScoped<FeedService>();
builder.Services.AddScoped<EcosService>();
builder.Services.AddSingleton<FeedRanker>();
builder.Services.AddSingleton<MusicAffinityCalculator>();
builder.Services.AddScoped<AffinityService>();
builder.Services.AddSingleton<JwtService>();
builder.Services.AddTransient<SpotifyRateLimitHandler>();
builder.Services.AddHttpClient<SpotifyAuthService>();
builder.Services.AddHttpClient<MediaLinkService>();
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

        // Los WebSockets del chat no pueden mandar el header Authorization:
        // SignalR manda el JWT en la query string y lo recogemos aquí
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken) &&
                    context.HttpContext.Request.Path.StartsWithSegments("/hubs/chat"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            },
        };
    });

// El frontend corre en otro origen: Vite en desarrollo y FRONTEND_URL en producción
var allowedOrigins = new List<string> { "http://localhost:5173", "http://127.0.0.1:5173" };
if (builder.Configuration["FRONTEND_URL"] is { Length: > 0 } frontendUrl)
{
    // El origen es solo esquema + host (sin la ruta /sorofy de GitHub Pages)
    allowedOrigins.Add(new Uri(frontendUrl).GetLeftPart(UriPartial.Authority));
}
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy
        .WithOrigins(allowedOrigins.ToArray())
        .AllowAnyHeader()
        .AllowAnyMethod());
});

builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Aplica las migraciones pendientes al arrancar, así el deploy crea las tablas solo
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}

// Las fotos de los grupos locales se guardan en disco (wwwroot/uploads) y
// se sirven como estáticos: es un proyecto de portfolio, no hace falta un
// proveedor de almacenamiento externo
app.UseStaticFiles();

app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");

app.Run();

static string ConnectionStringFromUrl(string url)
{
    var uri = new Uri(url);
    var userInfo = uri.UserInfo.Split(':', 2);
    var port = uri.Port > 0 ? uri.Port : 5432;
    return $"Host={uri.Host};Port={port};Database={uri.AbsolutePath.TrimStart('/')};" +
           $"Username={Uri.UnescapeDataString(userInfo[0])};Password={Uri.UnescapeDataString(userInfo[1])};" +
           "SSL Mode=Prefer";
}
