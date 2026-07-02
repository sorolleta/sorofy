# Etapa 1: compilar y publicar
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restaurar primero solo con el csproj para aprovechar la cache de capas
COPY src/SameSpot.Api/SameSpot.Api.csproj src/SameSpot.Api/
RUN dotnet restore src/SameSpot.Api/SameSpot.Api.csproj

COPY . .
RUN dotnet publish src/SameSpot.Api -c Release -o /app/publish

# Etapa 2: imagen final solo con el runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "SameSpot.Api.dll"]
