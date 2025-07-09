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

[ApiController]
[Route("api/users")]


    public class UsersController : ControllerBase
    {
        private readonly GeoLogDbContext _context;
        private readonly IMapper _mapper;
        private readonly IConfiguration _configuration; // Do odczytu konfiguracji

    public UsersController(GeoLogDbContext context, IMapper mapper, IConfiguration configuration)
    {
        _context = context;
        _mapper = mapper;
        _configuration = configuration;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginUserDto logindto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == logindto.Username);
        if ( user == null || !BCrypt.Net.BCrypt.Verify(logindto.Password, user.HashedPassword))
        {
            return Unauthorized(new { message = "Niepoprawne hasło, lub nazwa użytkownika" });
        }

        // 3. Jeśli wszystko się zgadza - generujemy token JWT.
        var token = GenerateJwtToken(user);

        // 4. Zwracamy token do klienta.
        return Ok(new { token = token });
    }

    private string GenerateJwtToken(User user)
    {
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()), // Standardowy claim - Subject (ID użytkownika)
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()), // Standardowy claim - unikalne ID tokena
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()), // Inna forma ID, często używana
            new Claim(ClaimTypes.Name, user.Username) // Nazwa użytkownika
        };

        // Pobieramy nasz super-tajny klucz z appsettings.json
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
        // Tworzymy "kredensjały" do podpisania tokena
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // Ustawiamy datę wygaśnięcia tokena (np. na 1 dzień)
        var expires = DateTime.UtcNow.AddDays(1);

        // Tworzymy obiekt tokena
        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: expires,
            signingCredentials: creds
        );

        // Serializujemy token do formatu string
        return new JwtSecurityTokenHandler().WriteToken(token);
    }


    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterUserDto registerDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var username = registerDto.Username;
        var email = registerDto.Email;
        // Sprawdzamy oba warunki w jednym zapytaniu do bazy - to jest bardziej wydajne!
        var userExists = await _context.Users
            .AnyAsync(u => u.Username == username || u.Email == email);

        if (userExists)
        {
            // Możemy nawet sprawdzić, które pole jest zduplikowane,
            // aby dać użytkownikowi lepszą informację zwrotną.
            if (await _context.Users.AnyAsync(u => u.Username == username))
            {
                return Conflict(new { message = "Podana nazwa użytkownika jest już zajęta." });
            }
            if (await _context.Users.AnyAsync(u => u.Email == email))
            {
                return Conflict(new { message = "Użytkownik o podanym adresie email już istnieje." });
            }
        }

        var newUser = new User
        {
            // Id, CreatedAt, UpdatedAt są generowane automatycznie
            Email = email,
            Username = username,
            HashedPassword = BCrypt.Net.BCrypt.HashPassword(registerDto.Password),

            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,

        }; 

        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        var userToReturn = _mapper.Map<UserDto>(newUser);

        // Zwracamy kod 201 Created wraz z danymi nowego użytkownika.
        // Użycie nameof(GetUserById) byłoby lepsze, ale na razie nie mamy tej metody.
        // Zostawmy prostszą wersję.
        return StatusCode(201, userToReturn);
    }
}
