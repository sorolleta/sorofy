using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public interface IListaRepository
{
    Task<List<Lista>> GetAllAsync(int limit);
    Task<Lista?> GetByIdAsync(Guid id);
    // Las que cura un usuario, para "Añadir a una estantería"
    Task<List<Lista>> GetByCuratorAsync(Guid curatorId);
    Task AddAsync(Lista lista);
    void Remove(Lista lista);

    Task<ListaItem?> GetItemAsync(Guid itemId);
    Task AddItemAsync(ListaItem item);
    void RemoveItem(ListaItem item);

    // Para Ecos: lo que las estanterías de un usuario han movido
    Task<List<ListaSave>> GetRecentSavesReceivedAsync(Guid curatorId, int limit);
    Task<List<ListaItem>> GetRecentItemsReceivedAsync(Guid curatorId, int limit);

    Task<bool> IsSavedByAsync(Guid userId, Guid listaId);
    Task SaveListaAsync(Guid userId, Guid listaId);
    Task UnsaveListaAsync(Guid userId, Guid listaId);

    Task SaveChangesAsync();
}
