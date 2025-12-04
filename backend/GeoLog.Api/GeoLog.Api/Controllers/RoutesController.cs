using AutoMapper;
using GeoLog.Api.Data;
using GeoLog.Api.Data.Entities;
using GeoLog.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Xml.Linq;

[ApiController]
[Route("api/routes")]
public class RoutesController : ControllerBase
{
    private readonly GeoLogDbContext _context;
    private readonly IMapper _mapper;

    public RoutesController(GeoLogDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    [HttpPost("upload")]
    [Authorize]
    public async Task<IActionResult> UploadRoute([FromForm] RouteUploadDto uploadDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        if (uploadDto.GpxFile == null || uploadDto.GpxFile.Length == 0)
        {
            return BadRequest(new { message = "Plik GPX jest wymagany." });
        }

        if (!uploadDto.GpxFile.FileName.EndsWith(".gpx", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Dozwolone są tylko pliki z rozszerzeniem .gpx" });
        }

        if (!TryGetUserId(out var userId) || userId == null)
        {
            return Unauthorized();
        }

        var user = await _context.Users.FindAsync(userId.Value);
        if (user == null)
        {
            return NotFound("Użytkownik nie został znaleziony.");
        }

        try
        {
            var route = await ParseGpxAndCreateRoute(uploadDto, userId.Value);

            _context.Routes.Add(route);
            await _context.SaveChangesAsync();

            if (route.RouteStat != null)
            {
                route.RouteStat.RouteId = route.Id;
                _context.Entry(route.RouteStat).State = EntityState.Modified;
                await _context.SaveChangesAsync();
            }

            var routeWithRelations = await _context.Routes
                .Include(r => r.RouteStat)
                .FirstOrDefaultAsync(r => r.Id == route.Id);

            var routeDto = _mapper.Map<RouteDto>(routeWithRelations);
            return CreatedAtAction(nameof(GetRoute), new { id = route.Id }, routeDto);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Błąd podczas przetwarzania pliku GPX: {ex.Message}", details = ex.GetType().Name });
        }
    }

    //pobieranie trasy według id

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<RouteDto>> GetRoute(Guid id)
    {
        var route = await _context.Routes
            .Include(r => r.RouteStat)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (route == null)
        {
            return NotFound(new { message = "Trasa o podanym ID nie istnieje." });
        }

        if (route.Visibility == RouteVisibility.Public || route.Visibility == RouteVisibility.Unlisted)
        {
            return Ok(_mapper.Map<RouteDto>(route));
        }

        if (route.Visibility == RouteVisibility.Private)
        {
            if (TryGetUserId(out var userId) && userId.HasValue && route.UserId == userId.Value)
            {
                return Ok(_mapper.Map<RouteDto>(route));
            }

            // Zwracamy 404, aby nie ujawniać istnienia prywatnej trasy
            return NotFound(new { message = "Trasa jest prywatna i nie masz do niej dostępu." });
        }

        // Domyślnie, dla jakichkolwiek innych nieprzewidzianych przypadków
        return NotFound();
    }

    // indpoint getroutepoints

    [HttpGet("{id:guid}/points")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<RoutePointDto>>> GetRoutePoints(Guid id)
    {
        var route = await _context.Routes
            .Include(r => r.RoutePoints.OrderBy(p => p.Sequence))
            .FirstOrDefaultAsync(r => r.Id == id);

        if (route == null)
        {
            return NotFound(new { message = "Trasa o podanym ID nie istnieje." });
        }

        if (route.Visibility == RouteVisibility.Public || route.Visibility == RouteVisibility.Unlisted)
        {
            var publicPoints = _mapper.Map<IEnumerable<RoutePointDto>>(route.RoutePoints);
            return Ok(publicPoints);
        }

        if (route.Visibility == RouteVisibility.Private)
        {
            if (TryGetUserId(out var userId) && userId.HasValue && route.UserId == userId.Value)
            {
                var privatePoints = _mapper.Map<IEnumerable<RoutePointDto>>(route.RoutePoints);
                return Ok(privatePoints);
            }
            return NotFound(new { message = "Punkty tej trasy są prywatne i nie masz do nich dostępu." });
        }

        return NotFound();
    }

    // Endpoint zwracający listę tras zalogowanego użytkownika (dla strony "Moje Konto")
    [HttpGet]
    [Authorize]
    public async Task<ActionResult<IEnumerable<RouteDto>>> GetRoutes()
    {
        if (!TryGetUserId(out var userId) || userId == null)
        {
            return Unauthorized();
        }

        var routes = await _context.Routes
            .Where(r => r.UserId == userId.Value)
            .Include(r => r.RouteStat)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var routeDtos = _mapper.Map<IEnumerable<RouteDto>>(routes);
        return Ok(routeDtos);
    }

    // Endpoint zwracający tylko publiczne trasy (dla strony "Odkrywaj")
    [HttpGet("public")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<RouteDto>>> GetPublicRoutes([FromQuery] string? q = null, [FromQuery] string sortBy = "createdAt", [FromQuery] string sortOrder = "desc")
    {


        var query = _context.Routes
            .Where(r => r.Visibility == RouteVisibility.Public)
            .Include(r => r.RouteStat)
            .OrderByDescending(r => r.CreatedAt)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.ToLower();
            query = query.Where(r =>
                r.Name.ToLower().Contains(term) ||
                (r.Description != null && r.Description.ToLower().Contains(term)));
        }

        var isDescending = sortOrder.ToLower() == "desc";
        query = sortBy.ToLower() switch
        {
            "distance" => isDescending ? query.OrderByDescending(r => r.RouteStat.TotalDistanceMeters)
            : query.OrderBy(r => r.RouteStat.TotalDistanceMeters),
            "duration" => isDescending
            ? query.OrderByDescending(r => r.RouteStat.DurationSeconds)
            : query.OrderBy(r => r.RouteStat.DurationSeconds),
            _ => isDescending // Domyślnie sortuj po dacie utworzenia
                ? query.OrderByDescending(r => r.CreatedAt)
                : query.OrderBy(r => r.CreatedAt),
        };
        var items = await query.ToListAsync();
        var dtos = _mapper.Map<IEnumerable<RouteDto>>(items);

        return Ok(dtos);
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteRoute(Guid id)
    {
        if (!TryGetUserId(out var userId) || userId == null)
        {
            return Unauthorized();
        }

        var route = await _context.Routes
            .FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId.Value);

        if (route == null)
        {
            return NotFound();
        }

        _context.Routes.Remove(route);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool TryGetUserId(out Guid? userId)
    {
        userId = null;
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var parsedId))
        {
            return false;
        }
        userId = parsedId;
        return true;
    }

    private async Task<GeoRoute> ParseGpxAndCreateRoute(RouteUploadDto uploadDto, Guid userId)
    {
        using var stream = uploadDto.GpxFile.OpenReadStream();
        XDocument gpxDoc = await XDocument.LoadAsync(stream, LoadOptions.None, CancellationToken.None);

        var route = new GeoRoute
        {
            UserId = userId,
            Name = uploadDto.Name,
            Description = uploadDto.Description,
            Visibility = uploadDto.Visibility,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var routePoints = ParseGpxTrackPoints(gpxDoc);

        if (!routePoints.Any())
        {
            throw new InvalidOperationException("Nie znaleziono punktów trasy w pliku GPX.");
        }

        for (int i = 0; i < routePoints.Count; i++)
        {
            routePoints[i].Sequence = i + 1;
            routePoints[i].GeoRoute = route;
        }

        route.RoutePoints = routePoints;

        var stats = CalculateRouteStatistics(routePoints);
        stats.LastRecalculatedAt = DateTime.UtcNow;
        route.RouteStat = stats;

        return route;
    }

    private List<RoutePoint> ParseGpxTrackPoints(XDocument gpxDoc)
    {
        var points = new List<RoutePoint>();
        var ns = gpxDoc.Root?.Name.Namespace ?? XNamespace.None;
        var trackPoints = gpxDoc.Descendants(ns + "trkpt");
        var culture = System.Globalization.CultureInfo.InvariantCulture;

        foreach (var trkpt in trackPoints)
        {
            if (!double.TryParse(trkpt.Attribute("lat")?.Value, System.Globalization.NumberStyles.Float, culture, out var latitude) ||
                !double.TryParse(trkpt.Attribute("lon")?.Value, System.Globalization.NumberStyles.Float, culture, out var longitude))
            {
                continue;
            }

            double? elevation = null;
            if (trkpt.Element(ns + "ele") != null && double.TryParse(trkpt.Element(ns + "ele")?.Value, System.Globalization.NumberStyles.Float, culture, out var ele))
            {
                elevation = ele;
            }

            DateTime timestamp = DateTime.UtcNow;
            if (trkpt.Element(ns + "time") != null && DateTime.TryParse(trkpt.Element(ns + "time")?.Value, out var parsedTime))
            {
                timestamp = DateTime.SpecifyKind(parsedTime, DateTimeKind.Utc);
            }

            var coordinate = elevation.HasValue
                ? new NetTopologySuite.Geometries.CoordinateZ(longitude, latitude, elevation.Value)
                : new NetTopologySuite.Geometries.Coordinate(longitude, latitude);

            points.Add(new RoutePoint
            {
                Location = new NetTopologySuite.Geometries.Point(coordinate) { SRID = 4326 },
                Timestamp = timestamp,
                Sequence = points.Count + 1
            });
        }
        return points;
    }

    private RouteStat CalculateRouteStatistics(List<RoutePoint> routePoints)
    {
        if (routePoints.Count < 2) return new RouteStat();

        routePoints.Sort((a, b) => a.Sequence.CompareTo(b.Sequence));
        var stats = new RouteStat { StartTime = routePoints.First().Timestamp, EndTime = routePoints.Last().Timestamp };
        double totalDistance = 0, maxSpeed = 0, elevationGain = 0, elevationLoss = 0;

        for (int i = 1; i < routePoints.Count; i++)
        {
            var prev = routePoints[i - 1]; var curr = routePoints[i];
            var distance = CalculateDistance(prev.Location.Y, prev.Location.X, curr.Location.Y, curr.Location.X);
            totalDistance += distance;

            var prevZ = GetZCoordinate(prev.Location.Coordinate);
            var currZ = GetZCoordinate(curr.Location.Coordinate);
            if (prevZ.HasValue && currZ.HasValue)
            {
                var diff = currZ.Value - prevZ.Value;
                if (diff > 0) elevationGain += diff; else elevationLoss += Math.Abs(diff);
            }

            var timeDiff = (curr.Timestamp - prev.Timestamp).TotalHours;
            if (timeDiff > 0)
            {
                var speed = (distance / 1000) / timeDiff;
                if (speed > maxSpeed) maxSpeed = speed;
            }
        }
        var duration = (stats.EndTime - stats.StartTime).TotalSeconds;
        stats.TotalDistanceMeters = (decimal)totalDistance;
        stats.DurationSeconds = (int)duration;
        stats.AvgSpeedKmh = duration > 0 ? (decimal)((totalDistance / 1000) / (duration / 3600)) : 0;
        stats.MaxSpeedKmh = (decimal)maxSpeed;
        stats.ElevationGainMeters = (decimal)elevationGain;
        stats.ElevationLossMeters = (decimal)elevationLoss;
        return stats;
    }

    private double? GetZCoordinate(NetTopologySuite.Geometries.Coordinate coordinate) => (coordinate is NetTopologySuite.Geometries.CoordinateZ cz) ? cz.Z : null;
    private double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
    {
        var R = 6371000;
        var dLat = (lat2 - lat1) * (Math.PI / 180);
        var dLon = (lon2 - lon1) * (Math.PI / 180);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) + Math.Cos(lat1 * (Math.PI / 180)) * Math.Cos(lat2 * (Math.PI / 180)) * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }

    [HttpPut("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> UpdateRoute(Guid id, [FromBody] UpdateRouteDto dto)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized();
        }

        var route = await _context.Routes.FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);

        if (route == null)
        {
            return NotFound("Trasa nie została znaleziona lub nie masz do niej uprawnień");
        }

        route.Name = dto.Name;
        route.Description = dto.Description;
        route.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("create")]
    [Authorize]
    public async Task<IActionResult> CreateRoute([FromBody] RouteCreateDto createDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        if (!TryGetUserId(out var userId) || userId == null)
        {
            return Unauthorized();
        }

        try
        {
            var route = new GeoRoute
            {
                UserId = userId.Value,
                Name = createDto.Name,
                Description = createDto.Description,
                Visibility = createDto.Visibility,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var routePoints = new List<RoutePoint>();
            for (int i = 0; i < createDto.Points.Count; i++)
            {
                var pointDto = createDto.Points[i];
                var coordinate = new NetTopologySuite.Geometries.CoordinateZ(pointDto.Longitude, pointDto.Latitude, 0);
                routePoints.Add(new RoutePoint
                {
                    Location = new NetTopologySuite.Geometries.Point(coordinate) { SRID = 4326 },
                    Timestamp = DateTime.UtcNow.AddSeconds(i),
                    Sequence = i + 1,
                });
            }
            route.RoutePoints = routePoints;

            var stats = CalculateRouteStatistics(routePoints);
            stats.LastRecalculatedAt = DateTime.UtcNow;
            route.RouteStat = stats;

            _context.Routes.Add(route);
            await _context.SaveChangesAsync();


            var routeDto = _mapper.Map<RouteDto>(route);
            return CreatedAtAction(nameof(GetRoute), new { id = route.Id }, routeDto);
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = $"Błąd podczas tworzenia trasy: {ex.Message}", details = ex.InnerException?.Message });
        }
    }
}