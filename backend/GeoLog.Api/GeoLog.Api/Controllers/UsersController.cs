using AutoMapper;
using GeoLog.Api.Data;
using GeoLog.Api.Data.Entities;
using GeoLog.Api.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using MailKit.Net.Smtp;
using MimeKit;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly GeoLogDbContext _context;
    private readonly IMapper _mapper;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _webHostEnvironment;

    public UsersController(GeoLogDbContext context, IMapper mapper, IConfiguration configuration, IWebHostEnvironment webHostEnvironment)
    {
        _context = context;
        _mapper = mapper;
        _configuration = configuration;
        _webHostEnvironment = webHostEnvironment;
    }

    // ======================================================================
    // ZMODYFIKOWANY ENDPOINT LOGOWANIA
    // ======================================================================
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginUserDto loginDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == loginDto.Username.ToLower());

        // NOWY WARUNEK: Sprawdź, czy konto jest zweryfikowane
        if (user != null && user.VerifiedAt == null)
        {
            return Unauthorized(new { message = "Konto nie zostało aktywowane. Sprawdź swoją skrzynkę e-mail i kliknij link weryfikacyjny." });
        }

        if (user == null || !BCrypt.Net.BCrypt.Verify(loginDto.Password, user.HashedPassword))
        {
            return Unauthorized(new { message = "Nieprawidłowa nazwa użytkownika lub hasło." });
        }

        var userDto = _mapper.Map<UserDto>(user);
        var token = GenerateJwtToken(user);
        return Ok(new { token = token, user = userDto });
    }

    // ======================================================================
    // ZMODYFIKOWANY ENDPOINT REJESTRACJI
    // ======================================================================
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterUserDto registerDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        if (await _context.Users.AnyAsync(u => u.Username.ToLower() == registerDto.Username.ToLower()))
        {
            return Conflict(new { message = "Podana nazwa użytkownika jest już zajęta." });
        }
        if (await _context.Users.AnyAsync(u => u.Email.ToLower() == registerDto.Email.ToLower()))
        {
            return Conflict(new { message = "Użytkownik o podanym adresie email już istnieje." });
        }

        var newUser = new User
        {
            Email = registerDto.Email,
            Username = registerDto.Username,
            HashedPassword = BCrypt.Net.BCrypt.HashPassword(registerDto.Password),
            VerificationToken = CreateRandomToken(), // Generujemy token weryfikacyjny
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            VerifiedAt = null // Ustawiamy datę weryfikacji na null
        };

        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        // Wysyłamy e-mail weryfikacyjny
        try
        {
            await SendVerificationEmail(newUser, newUser.VerificationToken);
        }
        catch (Exception ex)
        {
            // Opcjonalnie: logowanie błędu wysyłki e-mail.
            // Nie przerywamy operacji, aby nie blokować rejestracji, jeśli serwer e-mail ma problem.
            Console.WriteLine($"Nie udało się wysłać e-maila weryfikacyjnego do {newUser.Email}: {ex.Message}");
        }

        return StatusCode(201, new { message = "Rejestracja pomyślna. Sprawdź swoją skrzynkę e-mail, aby aktywować konto." });
    }

    // ======================================================================
    // NOWY ENDPOINT DO WERYFIKACJI E-MAIL
    // ======================================================================
    [HttpPost("verify-email")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyDto dto)
    {
        if (string.IsNullOrEmpty(dto.Token))
        {
            return BadRequest(new { message = "Token jest wymagany." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.VerificationToken == dto.Token);

        if (user == null)
        {
            return BadRequest(new { message = "Nieprawidłowy token weryfikacyjny." });
        }

        if (user.VerifiedAt != null)
        {
            return BadRequest(new { message = "To konto zostało już zweryfikowane." });
        }

        user.VerifiedAt = DateTime.UtcNow;
        user.VerificationToken = null; // Token jest jednorazowy, więc go czyścimy

        await _context.SaveChangesAsync();

        return Ok(new { message = "Konto zostało pomyślnie zweryfikowane. Możesz się teraz zalogować." });
    }

    // Pozostałe metody bez większych zmian
    private string GenerateJwtToken(User user)
    {
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username)
        };
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.UtcNow.AddDays(1);
        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: expires,
            signingCredentials: creds
        );
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string CreateRandomToken()
    {
        // 32 bajty dadzą 64-znakowy string szesnastkowy, co jest wystarczająco bezpieczne.
        return Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    }

    [HttpGet("GetUserId")]
    [Authorize]
    public async Task<ActionResult<UserDto>> GetMe()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
            return Unauthorized();
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound();
        var dto = _mapper.Map<UserDto>(user);
        return Ok(dto);
    }

    [HttpPost("avatar")]
    [Authorize]
    public async Task<IActionResult> UploadAvatar([FromForm] AvatarUploadDto dto)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId)) return Unauthorized();
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound("Użytkownik nie został znaleziony.");
        var file = dto.AvatarFile;
        if (file == null || file.Length == 0) return BadRequest(new { message = "Plik nie został przesłany!" });
        var validExtensions = new[] { ".jpg" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrEmpty(extension) || !validExtensions.Contains(extension)) return BadRequest(new { message = "Nieprawidłowe rozszerzenie pliku. Dozwolone są .jpg" });
        using var image = await Image.LoadAsync(file.OpenReadStream());
        if (image.Width > 640 || image.Height > 640)
        {
            image.Mutate(x => x.Resize(new ResizeOptions { Size = new Size(640, 640), Mode = ResizeMode.Crop }));
        }
        var uploadsFolder = Path.Combine(_webHostEnvironment.WebRootPath, "avatars");
        if (!string.IsNullOrEmpty(user.AvatarUrl))
        {
            var oldAvatarPath = Path.Combine(_webHostEnvironment.WebRootPath, user.AvatarUrl.TrimStart('/'));
            if (System.IO.File.Exists(oldAvatarPath))
            {
                System.IO.File.Delete(oldAvatarPath);
            }
        }
        if (!Directory.Exists(uploadsFolder))
        {
            Directory.CreateDirectory(uploadsFolder);
        }
        var uniqueFileName = $"{userId}{extension}";
        var newFilePath = Path.Combine(uploadsFolder, uniqueFileName);
        await image.SaveAsJpegAsync(newFilePath);
        var publicPath = $"/avatars/{uniqueFileName}";
        user.AvatarUrl = publicPath;
        _context.Users.Update(user);
        await _context.SaveChangesAsync();
        return Ok(new { avatarUrl = publicPath });
    }

    // ======================================================================
    // NOWA METODA POMOCNICZA DO WYSYŁKI E-MAILI
    // ======================================================================
    private async Task SendVerificationEmail(User user, string token)
    {
        var emailSettings = _configuration.GetSection("EmailSettings");
        // Upewnij się, że port frontendu się zgadza
        var verificationLink = $"http://localhost:5173/verify-email/{token}";

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(emailSettings["SenderName"], emailSettings["SenderEmail"]));
        message.To.Add(new MailboxAddress(user.Username, user.Email));
        message.Subject = "Potwierdź swój adres e-mail w GeoLog";

        message.Body = new TextPart("html")
        {
            Text = $@"
                <p>Witaj {user.Username},</p>
                <p>Dziękujemy za rejestrację w aplikacji GeoLog. Aby aktywować swoje konto, kliknij w poniższy link:</p>
                <p><a href='{verificationLink}'>Aktywuj konto</a></p>
                <p>Jeśli przycisk nie działa, skopiuj i wklej ten adres do przeglądarki:</p>
                <p>{verificationLink}</p>
                <p>Jeśli to nie Ty zakładałeś konto, zignoruj tę wiadomość.</p>"
        };

        using var client = new SmtpClient();
        await client.ConnectAsync(emailSettings["SmtpServer"], int.Parse(emailSettings["Port"]), MailKit.Security.SecureSocketOptions.StartTls);
        await client.AuthenticateAsync(emailSettings["Username"], emailSettings["Password"]);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if(string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized();
        }

        var user = await _context.Users.FindAsync(userId);
        if(user == null)
        {
            return NotFound("Użytkownik nie został znamleniony!");
        }

        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.HashedPassword))
        {
            return BadRequest(new { message = "Nieprawidłowe hasło!" });
        }

        user.HashedPassword = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Hasło zostało pomyślnie zmienione!" });
    } 
}