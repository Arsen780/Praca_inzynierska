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
[Authorize]
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
    public async Task<IActionResult> UploadRoute([FromForm] RouteUploadDto uploadDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // Walidacja pliku
        if (uploadDto.GpxFile == null || uploadDto.GpxFile.Length == 0)
        {
            return BadRequest(new { message = "Plik GPX jest wymagany." });
        }

        if (!uploadDto.GpxFile.FileName.EndsWith(".gpx", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Dozwolone są tylko pliki z rozszerzeniem .gpx" });
        }

        // Pobierz użytkownika
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized();
        }

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound("Użytkownik nie został znaleziony.");
        }

        try
        {
            // Parsuj GPX i twórz trasę
            var route = await ParseGpxAndCreateRoute(uploadDto, userId);

            _context.Routes.Add(route);
            await _context.SaveChangesAsync();

            // Załaduj relacje przed mapowaniem
            var routeWithRelations = await _context.Routes
                .Include(r => r.RouteStat)
                .FirstOrDefaultAsync(r => r.Id == route.Id);

            var routeDto = _mapper.Map<RouteDto>(routeWithRelations);
            return CreatedAtAction(nameof(GetRoute), new { id = route.Id }, routeDto);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Błąd podczas przetwarzania pliku GPX: {ex.Message}" });
        }
    }

    private async Task<GeoRoute> ParseGpxAndCreateRoute(RouteUploadDto uploadDto, Guid userId)
    {
        using var stream = uploadDto.GpxFile.OpenReadStream();
        var gpxDoc = XDocument.Load(stream);

        var route = new GeoRoute
        {
            UserId = userId,
            Name = uploadDto.Name,
            Description = uploadDto.Description,
            Visibility = uploadDto.Visibility,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Parsuj punkty trasy
        var routePoints = ParseGpxTrackPoints(gpxDoc);

        if (!routePoints.Any())
        {
            throw new InvalidOperationException("Nie znaleziono punktów trasy w pliku GPX.");
        }

        // Ustaw sekwencję i RouteId
        for (int i = 0; i < routePoints.Count; i++)
        {
            routePoints[i].Sequence = i + 1;
            routePoints[i].GeoRoute = route;
        }

        route.RoutePoints = routePoints;

        // Oblicz statystyki
        var stats = CalculateRouteStatistics(routePoints);
        stats.LastRecalculatedAt = DateTime.UtcNow;
        route.RouteStat = stats;

        return route;
    }

    private List<RoutePoint> ParseGpxTrackPoints(XDocument gpxDoc)
    {
        var points = new List<RoutePoint>();
        var ns = gpxDoc.Root?.Name.Namespace ?? XNamespace.None;

        // Szukaj track points (trkpt)
        var trackPoints = gpxDoc.Descendants(ns + "trkpt")
            .Concat(gpxDoc.Descendants("trkpt"));

        foreach (var trkpt in trackPoints)
        {
            var latAttr = trkpt.Attribute("lat");
            var lonAttr = trkpt.Attribute("lon");

            if (latAttr == null || lonAttr == null) continue;

            if (!double.TryParse(latAttr.Value, out var latitude) ||
                !double.TryParse(lonAttr.Value, out var longitude))
                continue;

            // Szukaj elewacji
            var eleElement = trkpt.Element(ns + "ele") ?? trkpt.Element("ele");
            double? elevation = null;
            if (eleElement != null && double.TryParse(eleElement.Value, out var ele))
            {
                elevation = ele;
            }

            // Szukaj czasu
            var timeElement = trkpt.Element(ns + "time") ?? trkpt.Element("time");
            var timestamp = timeElement != null && DateTime.TryParse(timeElement.Value, out var time) ? time : DateTime.UtcNow;

            // Twórz punkt z NetTopologySuite
            var coordinate = elevation.HasValue
                ? new NetTopologySuite.Geometries.CoordinateZ(longitude, latitude, elevation.Value)
                : new NetTopologySuite.Geometries.Coordinate(longitude, latitude);

            var point = new NetTopologySuite.Geometries.Point(coordinate)
            {
                SRID = 4326 // WGS84
            };

            points.Add(new RoutePoint
            {
                Location = point,
                Timestamp = timestamp,
                Sequence = points.Count + 1
            });
        }

        // Jeśli nie ma track points, spróbuj route points
        if (!points.Any())
        {
            var rtePoints = gpxDoc.Descendants(ns + "rtept")
                .Concat(gpxDoc.Descendants("rtept"));

            foreach (var rtept in rtePoints)
            {
                var latAttr = rtept.Attribute("lat");
                var lonAttr = rtept.Attribute("lon");

                if (latAttr == null || lonAttr == null) continue;

                if (!double.TryParse(latAttr.Value, out var latitude) ||
                    !double.TryParse(lonAttr.Value, out var longitude))
                    continue;

                var eleElement = rtept.Element(ns + "ele") ?? rtept.Element("ele");
                double? elevation = null;
                if (eleElement != null && double.TryParse(eleElement.Value, out var ele))
                {
                    elevation = ele;
                }

                var timeElement = rtept.Element(ns + "time") ?? rtept.Element("time");
                var timestamp = timeElement != null && DateTime.TryParse(timeElement.Value, out var time) ? time : DateTime.UtcNow;

                var coordinate = elevation.HasValue
                    ? new NetTopologySuite.Geometries.CoordinateZ(longitude, latitude, elevation.Value)
                    : new NetTopologySuite.Geometries.Coordinate(longitude, latitude);

                var point = new NetTopologySuite.Geometries.Point(coordinate)
                {
                    SRID = 4326
                };

                points.Add(new RoutePoint
                {
                    Location = point,
                    Timestamp = timestamp,
                    Sequence = points.Count + 1
                });
            }
        }

        return points;
    }

    private RouteStat CalculateRouteStatistics(List<RoutePoint> routePoints)
    {
        if (routePoints.Count == 0)
        {
            return new RouteStat
            {
                TotalDistanceMeters = 0,
                DurationSeconds = 0,
                AvgSpeedKmh = 0,
                MaxSpeedKmh = 0,
                ElevationGainMeters = 0,
                ElevationLossMeters = 0,
                StartTime = DateTime.UtcNow,
                EndTime = DateTime.UtcNow
            };
        }

        routePoints.Sort((a, b) => a.Sequence.CompareTo(b.Sequence));

        var stats = new RouteStat
        {
            StartTime = routePoints.First().Timestamp,
            EndTime = routePoints.Last().Timestamp
        };

        // Oblicz dystans
        double totalDistance = 0;
        double maxSpeed = 0;
        double elevationGain = 0;
        double elevationLoss = 0;

        for (int i = 1; i < routePoints.Count; i++)
        {
            var prevPoint = routePoints[i - 1];
            var currentPoint = routePoints[i];

            // Oblicz dystans między punktami (w metrach)
            var distance = CalculateDistance(
                prevPoint.Location.Coordinate.Y, prevPoint.Location.Coordinate.X,
                currentPoint.Location.Coordinate.Y, currentPoint.Location.Coordinate.X);

            totalDistance += distance;

            // Oblicz różnicę wysokości
            var prevZ = GetZCoordinate(prevPoint.Location.Coordinate);
            var currentZ = GetZCoordinate(currentPoint.Location.Coordinate);

            if (prevZ.HasValue && currentZ.HasValue)
            {
                var elevationDiff = currentZ.Value - prevZ.Value;
                if (elevationDiff > 0)
                    elevationGain += elevationDiff;
                else
                    elevationLoss += Math.Abs(elevationDiff);
            }

            // Oblicz prędkość (jeśli są znaczniki czasu)
            var timeDiff = (currentPoint.Timestamp - prevPoint.Timestamp).TotalHours;
            if (timeDiff > 0)
            {
                var speedKmh = (distance / 1000) / timeDiff; // km/h
                if (speedKmh > maxSpeed)
                    maxSpeed = speedKmh;
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

    private double? GetZCoordinate(NetTopologySuite.Geometries.Coordinate coordinate)
    {
        if (coordinate is NetTopologySuite.Geometries.CoordinateZ coordZ)
        {
            return coordZ.Z;
        }
        return null;
    }

    private double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
    {
        // Wzór Haversine do obliczania odległości między punktami na kuli ziemskiej
        var R = 6371000; // Promień Ziemi w metrach
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }

    private double ToRadians(double degrees)
    {
        return degrees * (Math.PI / 180);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<RouteDto>>> GetRoutes()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized();
        }

        var routes = await _context.Routes
            .Where(r => r.UserId == userId)
            .Include(r => r.RouteStat)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var routeDtos = _mapper.Map<IEnumerable<RouteDto>>(routes);
        return Ok(routeDtos);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<RouteDto>> GetRoute(Guid id)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized();
        }

        var route = await _context.Routes
            .Include(r => r.RouteStat)
            .Include(r => r.RoutePoints)
            .FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);

        if (route == null)
        {
            return NotFound();
        }

        var routeDto = _mapper.Map<RouteDto>(route);
        return Ok(routeDto);
    }

    [HttpGet("{id}/points")]
    public async Task<ActionResult<IEnumerable<RoutePointDto>>> GetRoutePoints(Guid id)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized();
        }

        var route = await _context.Routes
            .Include(r => r.RoutePoints)
            .FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);

        if (route == null)
        {
            return NotFound();
        }

        var points = route.RoutePoints.OrderBy(p => p.Sequence).ToList();
        var pointDtos = _mapper.Map<IEnumerable<RoutePointDto>>(points);

        return Ok(pointDtos);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRoute(Guid id)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized();
        }

        var route = await _context.Routes
            .FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);

        if (route == null)
        {
            return NotFound();
        }

        _context.Routes.Remove(route);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}