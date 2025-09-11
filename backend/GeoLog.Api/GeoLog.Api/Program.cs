using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using GeoLog.Api.Data;

var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";

var builder = WebApplication.CreateBuilder(args);

// ==========================================================
//      Sekcja Konfiguracji Serwisów (Dependency Injection)
// ==========================================================

builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins,
                      policy =>
                      {
                          policy.WithOrigins("http://localhost:5173")
                                .AllowAnyHeader()
                                .AllowAnyMethod();
                      });
});

builder.Services.AddDbContext<GeoLogDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"),
    o => o.UseNetTopologySuite())
    .UseSnakeCaseNamingConvention());

builder.Services.AddAutoMapper(cfg =>
{
    cfg.AddMaps(typeof(Program));
});

builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


// ==========================================================
//      Budowanie Aplikacji
// ==========================================================
var app = builder.Build();


// ==========================================================
//      Konfiguracja Potoku Przetwarzania ¯¹dañ HTTP (Middleware)
// ==========================================================

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors(MyAllowSpecificOrigins);

app.UseAuthorization();

app.MapControllers();

app.Run();