using Microsoft.EntityFrameworkCore;
using SameSpot.Api.Data;
using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public class ListaRepository(AppDbContext db) : IListaRepository
{
    // La rejilla de Estanterías: las más recientes primero, con lo justo
    // para pintar el collage de 4 carátulas
    public Task<List<Lista>> GetAllAsync(int limit) =>
        db.Listas
            .Include(l => l.Curator)
            .Include(l => l.Items).ThenInclude(i => i.MusicItem)
            .OrderByDescending(l => l.CreatedAt)
            .Take(limit)
            .ToListAsync();

    public Task<List<Lista>> GetByCuratorAsync(Guid curatorId) =>
        db.Listas
            .Include(l => l.Curator)
            .Include(l => l.Items).ThenInclude(i => i.MusicItem)
            .Where(l => l.CuratorId == curatorId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

    public Task<Lista?> GetByIdAsync(Guid id) =>
        db.Listas
            .Include(l => l.Curator)
            .Include(l => l.Items).ThenInclude(i => i.MusicItem)
            .Include(l => l.Items).ThenInclude(i => i.AddedByUser)
            .FirstOrDefaultAsync(l => l.Id == id);

    public async Task AddAsync(Lista lista) => await db.Listas.AddAsync(lista);

    // Sus canciones y los "guardados" se van con ella (borrado en cascada)
    public void Remove(Lista lista) => db.Listas.Remove(lista);

    public Task<ListaItem?> GetItemAsync(Guid itemId) =>
        db.ListaItems.FirstOrDefaultAsync(i => i.Id == itemId);

    public async Task AddItemAsync(ListaItem item) => await db.ListaItems.AddAsync(item);

    public void RemoveItem(ListaItem item) => db.ListaItems.Remove(item);

    // Alguien guardó una estantería tuya (los guardados propios no cuentan)
    public Task<List<ListaSave>> GetRecentSavesReceivedAsync(Guid curatorId, int limit) =>
        db.ListaSaves
            .Where(s => s.Lista.CuratorId == curatorId && s.UserId != curatorId)
            .Include(s => s.User)
            .Include(s => s.Lista)
            .OrderByDescending(s => s.CreatedAt)
            .Take(limit)
            .ToListAsync();

    // Alguien propuso una canción en una estantería tuya
    public Task<List<ListaItem>> GetRecentItemsReceivedAsync(Guid curatorId, int limit) =>
        db.ListaItems
            .Where(i => i.Lista.CuratorId == curatorId && i.AddedByUserId != curatorId)
            .Include(i => i.AddedByUser)
            .Include(i => i.Lista)
            .Include(i => i.MusicItem)
            .OrderByDescending(i => i.CreatedAt)
            .Take(limit)
            .ToListAsync();

    public Task<bool> IsSavedByAsync(Guid userId, Guid listaId) =>
        db.ListaSaves.AnyAsync(s => s.UserId == userId && s.ListaId == listaId);

    public async Task SaveListaAsync(Guid userId, Guid listaId)
    {
        if (await IsSavedByAsync(userId, listaId)) return;
        await db.ListaSaves.AddAsync(new ListaSave { UserId = userId, ListaId = listaId });
        await db.SaveChangesAsync();
    }

    public async Task UnsaveListaAsync(Guid userId, Guid listaId)
    {
        var save = await db.ListaSaves.FindAsync(userId, listaId);
        if (save is not null)
        {
            db.ListaSaves.Remove(save);
            await db.SaveChangesAsync();
        }
    }

    public Task SaveChangesAsync() => db.SaveChangesAsync();
}
