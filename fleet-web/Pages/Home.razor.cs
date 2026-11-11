using System.Text.Json;
using fleet_web.Models;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Forms;
using Microsoft.JSInterop;

namespace fleet_web.Pages;

public partial class Home
{
    private const string StorageKey = "martin95am.fleet.v1";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };
    [Inject] private IJSRuntime JS { get; set; } = default!;

    private List<FleetVehicle> items = [];
    private FleetVehicle draft = new();
    private Guid? editingId;
    private string filter = "todos";
    private string search = "";
    private string feedback = "";
    private bool feedbackError;
    private bool loaded;
    private bool showForm;

    private IEnumerable<FleetVehicle> VisibleItems => items
        .Where(x => (filter == "todos" || x.Type == filter) &&
            (string.IsNullOrWhiteSpace(search) ||
             new[] { x.Identifier, x.Manufacturer, x.Model, x.Country, x.Status }
                 .Any(value => value.Contains(search, StringComparison.CurrentCultureIgnoreCase))))
        .OrderBy(x => x.Type).ThenBy(x => x.Identifier);

    private string IdentifierLabel => draft.Type switch
    {
        "embarcacion" => "Matrícula / IMO",
        "avion" => "Matrícula aérea",
        _ => "Patente"
    };

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (!firstRender) return;
        try
        {
            var json = await JS.InvokeAsync<string?>("fleetStore.read", StorageKey);
            List<FleetVehicle> stored = string.IsNullOrWhiteSpace(json)
                ? [] : JsonSerializer.Deserialize<List<FleetVehicle>>(json, JsonOptions) ?? [];
            if (!ValidSet(stored)) throw new InvalidDataException();
            items = stored;
        }
        catch { SetFeedback("No se pudo leer el almacenamiento de este navegador.", true); }
        loaded = true;
        StateHasChanged();
    }

    private async Task PersistAsync(List<FleetVehicle> next)
    {
        await JS.InvokeVoidAsync("fleetStore.write", StorageKey, JsonSerializer.Serialize(next, JsonOptions));
        items = next;
    }

    private void SetFeedback(string message, bool error = false) { feedback = message; feedbackError = error; }
    private static bool ValidSet(List<FleetVehicle> records) =>
        records.Count <= 5000 && records.All(x => x is not null && x.Id != Guid.Empty && x.Validate() is null) &&
        records.Select(x => x.Id).Distinct().Count() == records.Count &&
        !records.GroupBy(x => $"{x.Type}|{x.Identifier.Trim()}", StringComparer.OrdinalIgnoreCase).Any(g => g.Count() > 1);
    private string TabClass(string type) => filter == type ? "active" : "";
    private void ShowAll() => filter = "todos";
    private void ShowAutos() => filter = "auto";
    private void ShowEmbarcaciones() => filter = "embarcacion";
    private void ShowAviones() => filter = "avion";
    private static string TypeLabel(string type) => type switch { "auto" => "Auto", "embarcacion" => "Embarcación", _ => "Avión" };
    private static string StatusLabel(string status) => status switch { "operativo" => "Operativo", "mantenimiento" => "Mantenimiento", _ => "Inactivo" };

    private void NewVehicle() { draft = new(); editingId = null; showForm = true; SetFeedback(""); }
    private void Edit(FleetVehicle item) { draft = item.Copy(); editingId = item.Id; showForm = true; SetFeedback(""); }
    private void Cancel() { showForm = false; editingId = null; }

    private async Task SaveAsync()
    {
        var error = draft.Validate();
        if (error is not null) { SetFeedback(error, true); return; }
        draft.Identifier = draft.Identifier.Trim();
        if (items.Any(x => x.Id != draft.Id && x.Type == draft.Type &&
            string.Equals(x.Identifier.Trim(), draft.Identifier, StringComparison.OrdinalIgnoreCase)))
        {
            SetFeedback("Ese identificador ya está registrado para este tipo.", true);
            return;
        }
        var next = items.Where(x => x.Id != draft.Id).Append(draft.Copy()).ToList();
        try
        {
            await PersistAsync(next);
            showForm = false;
            SetFeedback(editingId is null ? "Vehículo agregado." : "Vehículo actualizado.");
            editingId = null;
        }
        catch { SetFeedback("No se pudo guardar en este navegador. Revisá el espacio disponible.", true); }
    }

    private async Task DeleteAsync(FleetVehicle item)
    {
        if (!await JS.InvokeAsync<bool>("confirm", $"¿Eliminar {item.Identifier}? Esta acción no se puede deshacer.")) return;
        try
        {
            await PersistAsync(items.Where(x => x.Id != item.Id).ToList());
            SetFeedback("Vehículo eliminado.");
        }
        catch { SetFeedback("No se pudo guardar el cambio en este navegador.", true); }
    }

    private async Task ExportAsync()
    {
        await JS.InvokeVoidAsync("fleetStore.download", "flota-internacional.json", JsonSerializer.Serialize(items, JsonOptions));
        SetFeedback("Archivo exportado.");
    }

    private async Task ImportAsync(InputFileChangeEventArgs args)
    {
        try
        {
            await using var stream = args.File.OpenReadStream(2_000_000);
            using var reader = new StreamReader(stream);
            var imported = JsonSerializer.Deserialize<List<FleetVehicle>>(await reader.ReadToEndAsync(), JsonOptions);
            if (imported is null || !ValidSet(imported))
                throw new InvalidDataException();
            if (!await JS.InvokeAsync<bool>("confirm", $"¿Reemplazar la flota actual por {imported.Count} registros del archivo?")) return;
            await PersistAsync(imported);
            showForm = false;
            SetFeedback($"Se importaron {imported.Count} vehículos.");
        }
        catch { SetFeedback("El archivo no es válido o no se pudo guardar.", true); }
    }
}
