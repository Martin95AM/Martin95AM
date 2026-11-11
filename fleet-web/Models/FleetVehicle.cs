namespace fleet_web.Models;

public sealed class FleetVehicle
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Type { get; set; } = "auto";
    public string Identifier { get; set; } = "";
    public string Manufacturer { get; set; } = "";
    public string Model { get; set; } = "";
    public int Year { get; set; } = DateTime.Now.Year;
    public string Country { get; set; } = "";
    public string Status { get; set; } = "operativo";
    public decimal PayloadKg { get; set; }
    public string Notes { get; set; } = "";

    public FleetVehicle Copy() => (FleetVehicle)MemberwiseClone();

    public string? Validate()
    {
        if (Type is not ("auto" or "embarcacion" or "avion")) return "Elegí un tipo de vehículo.";
        if (string.IsNullOrWhiteSpace(Identifier) || Identifier.Length > 40) return "Ingresá un identificador de hasta 40 caracteres.";
        if (string.IsNullOrWhiteSpace(Manufacturer) || Manufacturer.Length > 80) return "Ingresá un fabricante de hasta 80 caracteres.";
        if (string.IsNullOrWhiteSpace(Model) || Model.Length > 80) return "Ingresá un modelo de hasta 80 caracteres.";
        if (Year < 1900 || Year > DateTime.Now.Year + 1) return "Ingresá un año válido.";
        if (string.IsNullOrWhiteSpace(Country) || Country.Length > 80) return "Ingresá un país de hasta 80 caracteres.";
        if (Status is not ("operativo" or "mantenimiento" or "inactivo")) return "Elegí un estado válido.";
        if (PayloadKg < 0 || PayloadKg > 100_000_000) return "Ingresá una capacidad de carga válida.";
        if (Notes is null || Notes.Length > 1000) return "Las observaciones pueden tener hasta 1000 caracteres.";
        return null;
    }
}
