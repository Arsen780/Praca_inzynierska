using AutoMapper;
using GeoLog.Api.Data;
using GeoLog.Api.Data.Entities;
using GeoLog.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Org.BouncyCastle.Tls;
using System.Security.Claims;
using System.Xml.Linq;

[ApiController]
[Route("api/routes")]
public class RoutesController : ControllerBase
{
    private const double MAX_REASONABLE_ACCELERATION = 7;

    private readonly GeoLogDbContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<RoutesController> _logger;

    public RoutesController(GeoLogDbContext context, IMapper mapper, ILogger<RoutesController> logger)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
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
            var (route, logs) = await ParseGpxAndCreateRoute(uploadDto, userId.Value);

            foreach (var line in logs)
            {
                _logger.LogInformation(line);
            }

            _context.Routes.Add(route);
            await _context.SaveChangesAsync();

            if (route.RouteStat != null)
            {
                route.RouteStat.RouteId = route.Id;
                _context.Entry(route.RouteStat).State = EntityState.Modified;
                await _context.SaveChangesAsync();
            }

            var routeDto = _mapper.Map<RouteDto>(route);

            return CreatedAtAction(nameof(GetRoute), new { id = route.Id }, routeDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Błąd podczas przetwarzania pliku GPX.");
            return BadRequest(new { message = $"Błąd podczas przetwarzania pliku GPX: {ex.Message}", details = ex.GetType().Name });
        }
    }

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

            return NotFound(new { message = "Trasa jest prywatna i nie masz do niej dostępu." });
        }

        return NotFound();
    }

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
            _ => isDescending
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

    private async Task<(GeoRoute Route, List<string> Logs)> ParseGpxAndCreateRoute(RouteUploadDto uploadDto, Guid userId)
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

        if (routePoints.Count < 2)
        {
            throw new InvalidOperationException("Plik GPX musi zawierać co najmniej 2 punkty, aby stworzyć trasę.");
        }

        var (sanitizedPoints, logs) = SanitizeRoutePoints(routePoints);

        for (int i = 0; i < sanitizedPoints.Count; i++)
        {
            sanitizedPoints[i].Sequence = i + 1;
            sanitizedPoints[i].GeoRoute = route;
        }

        route.RoutePoints = sanitizedPoints;

        var stats = CalculateRouteStatistics(sanitizedPoints);
        stats.LastRecalculatedAt = DateTime.UtcNow;
        route.RouteStat = stats;

        return (route, logs);
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

    private (List<RoutePoint> SanitizedPoints, List<string> Logs) SanitizeRoutePoints(List<RoutePoint> points)
    {
        var logs = new List<string>();
        if (points.Count < 4)
        {
            logs.Add("[Sanitizer] Trasa ma mniej niż 4 punkty, pomijam oczyszczanie.");
            return (points, logs);
        }

        var preliminaryAvgSpeed = CalculatePreliminaryAverageSpeed(points);
        var accelerationThreshold = GetAccelerationThresholdForActivity(preliminaryAvgSpeed, logs);
        var maxSpeedKmh = GetMaxSpeedForActivity(preliminaryAvgSpeed, logs);


        logs.Add($"[Sanitizer] Rozpoczynam oczyszczanie trasy z {points.Count} punktami...");
        int correctedPointsCount = 0;

        for (int i = 2; i < points.Count - 1; i++)
        {
            var p0 = points[i - 2];
            var p1 = points[i - 1];
            var p2 = points[i];
            var p3 = points[i + 1];

            var distance1 = CalculateDistance(p0.Location.Y, p0.Location.X, p1.Location.Y, p1.Location.X);
            var timeDiff1 = (p1.Timestamp - p0.Timestamp).TotalSeconds;
            var speed1 = (timeDiff1 > 0) ? (distance1 / timeDiff1) : 0;

            var distance2 = CalculateDistance(p1.Location.Y, p1.Location.X, p2.Location.Y, p2.Location.X);
            var timeDiff2 = (p2.Timestamp - p1.Timestamp).TotalSeconds;
            var speed2 = (timeDiff2 > 0) ? (distance2 / timeDiff2) : 0;
            var speed2Kmh = speed2 * 3.6;


            if (timeDiff2 <= 0) continue;

            var acceleration = (speed2 - speed1) / timeDiff2;

            var isAccelerationAnomaly = Math.Abs(acceleration) > accelerationThreshold;
            var isSpeedAnomaly = speed2Kmh > maxSpeedKmh;

            if (isAccelerationAnomaly || isSpeedAnomaly)
            {

                logs.Add($"--> [ANOMALIA!] Punkt sekwencji {p2.Sequence}");

                if (isSpeedAnomaly)
                {
                    logs.Add($"    Prędkość: {speed2Kmh:F1} km/h (limit: {maxSpeedKmh} km/h)");
                }

                if (isAccelerationAnomaly)
                {
                    logs.Add($"    Przyspieszenie: {acceleration:F2} m/s² (limit: {accelerationThreshold} m/s²)");
                }

                correctedPointsCount++;
                logs.Add($"--> [ANOMALIA!] Wykryto anomalię w punkcie o sekwencji: {p2.Sequence}.");
                logs.Add($"    Przyspieszenie: {acceleration:F2} m/s^2 (przekroczyło próg {accelerationThreshold} m/s^2).");
                logs.Add($"    Koryguję punkt przez interpolację...");

                var newLat = p1.Location.Y + (p3.Location.Y - p1.Location.Y) / 2.0;
                var newLon = p1.Location.X + (p3.Location.X - p1.Location.X) / 2.0;

                var p1z = GetZCoordinate(p1.Location.Coordinate);
                var p3z = GetZCoordinate(p3.Location.Coordinate);
                double? newEle = null;
                if (p1z.HasValue && p3z.HasValue)
                {
                    newEle = p1z.Value + (p3z.Value - p1z.Value) / 2.0;
                }

                var newTime = p1.Timestamp.AddSeconds((p3.Timestamp - p1.Timestamp).TotalSeconds / 2.0);

                var newCoordinate = newEle.HasValue
                    ? new NetTopologySuite.Geometries.CoordinateZ(newLon, newLat, newEle.Value)
                    : new NetTopologySuite.Geometries.Coordinate(newLon, newLat);

                var correctedPoint = new RoutePoint
                {
                    Location = new NetTopologySuite.Geometries.Point(newCoordinate) { SRID = 4326 },
                    Timestamp = newTime,
                    Sequence = p2.Sequence,
                    RouteId = p2.RouteId,
                    GeoRoute = p2.GeoRoute
                };

                points[i] = correctedPoint;

                // Zatrzymanie reakcji łańcuchowej przez pominięcie następnej iteracji
                i++;
            }
        }

        if (correctedPointsCount > 0)
        {
            logs.Add($"[Sanitizer] Zakończono oczyszczanie. Skorygowano łącznie {correctedPointsCount} punktów.");
        }
        else
        {
            logs.Add("[Sanitizer] Zakończono oczyszczanie. Nie znaleziono żadnych anomalii.");
        }

        return (points, logs);
    }

    private double CalculatePreliminaryAverageSpeed(List<RoutePoint> points)
    {
        if (points == null || points.Count < 2)
            return 0.0;

        var ordered = points.OrderBy(p => p.Timestamp).ToList();

        var segmentSpeeds = new List<double>();

        for (int i = 1; i < ordered.Count; i++)
        {
            var prev = ordered[i - 1];
            var curr = ordered[i];

            var dt = (curr.Timestamp - prev.Timestamp).TotalSeconds;
            if (dt <= 0) continue;

            var dist = CalculateDistance(
                prev.Location.Y, prev.Location.X,
                curr.Location.Y, curr.Location.X);

            var speedKmh = (dist / 1000.0) / (dt / 3600.0);

            if (double.IsFinite(speedKmh) && speedKmh > 0)
            {
                segmentSpeeds.Add(speedKmh);
            }
        }

        if (segmentSpeeds.Count == 0)
            return 0.0;

        segmentSpeeds.Sort();

        var n = segmentSpeeds.Count;
        var cut = (int)Math.Round(n * 0.10);

        var validCount = Math.Max(n - cut, Math.Min(n, 3));

        var trimmed = segmentSpeeds.Take(validCount).ToList();

        var avg = trimmed.Average();
        return avg;
    }

    private double GetAccelerationThresholdForActivity(double avgSpeedKmh, List<string> logs)
    {
        if (avgSpeedKmh < 10)
        {
            logs.Add($"[Sanitizer] Wykryto aktywność pieszą (śr. prędkość: {avgSpeedKmh:F1} km/h). Stosuję próg 1.5 m/s^2.");
            return 1.5;
        }
        if (avgSpeedKmh < 35)
        {
            logs.Add($"[Sanitizer] Wykryto aktywność rowerową (śr. prędkość: {avgSpeedKmh:F1} km/h). Stosuję próg 3.5 m/s^2.");
            return 3.5;
        }
        logs.Add($"[Sanitizer] Wykryto aktywność samochodową (śr. prędkość: {avgSpeedKmh:F1} km/h). Stosuję próg 7.5 m/s^2.");
        return 7.5;
    }

    private double GetMaxSpeedForActivity(double avgSpeedKmh, List<string> logs)
    {
        if (avgSpeedKmh < 10)
        {
            logs.Add("[Sanitizer] Maks. prędkość dla ruchu pieszego: 25 km/h.");
            return 25;
        }   
        if (avgSpeedKmh < 35)
        {
            logs.Add("[Sanitizer] Maks. prędkość dla jazdy rowerem: 100 km/h.");
            return 100;
        }

        logs.Add("[Sanitizer] Maks. prędkość dla pojazdu: 300 km/h.");
        return 300;
    }

    [Authorize]
    [HttpPut("{id}/points")]
    public async Task<IActionResult> UpdateRoutePoints(
    Guid id,
    [FromBody] List<UpdateRoutePointDto> points)
    {
        if (!TryGetUserId(out var userId) || userId == null)
            return Unauthorized();

        var route = await _context.Routes.Include(r => r.RoutePoints).Include(r => r.RouteStat).FirstOrDefaultAsync(r => r.Id == id);

        if (route == null)
            return NotFound();

        if (route.UserId != userId.Value)
            return Forbid();

        var ordered = route.RoutePoints.OrderBy(p => p.Sequence).ToList();

        var minSeq = ordered.First().Sequence;
        var maxSeq = ordered.Last().Sequence;

        foreach (var dto in points)
        {
            var point = ordered.FirstOrDefault(p => p.Id == dto.Id);
            if (point == null)
                continue;

            if (point.Sequence == minSeq || point.Sequence == maxSeq)
                continue;

            var prev = ordered.First(p => p.Sequence == point.Sequence - 1);
            var next = ordered.First(p => p.Sequence == point.Sequence + 1);

            var interpolatedTime = prev.Timestamp.AddSeconds(
                (next.Timestamp - prev.Timestamp).TotalSeconds / 2.0
            );

            double? newElevation = null;
            var prevZ = GetZCoordinate(prev.Location.Coordinate);
            var nextZ = GetZCoordinate(next.Location.Coordinate);
            if (prevZ.HasValue && nextZ.HasValue)
            {
                newElevation = prevZ.Value + (nextZ.Value - prevZ.Value) / 2.0;
            }

            var coordinate = newElevation.HasValue
                ? new NetTopologySuite.Geometries.CoordinateZ(dto.Longitude,dto.Latitude,newElevation.Value)
                : new NetTopologySuite.Geometries.Coordinate(dto.Longitude,dto.Latitude);

            point.Location = new NetTopologySuite.Geometries.Point(coordinate)
            {
                SRID = 4326
            };

            point.Timestamp = interpolatedTime;
        }

        var stats = CalculateRouteStatistics(ordered);
        stats.RouteId = route.Id;
        stats.LastRecalculatedAt = DateTime.UtcNow;

        route.RouteStat = stats;
        route.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

}