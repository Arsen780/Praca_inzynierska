using AutoMapper;
using GeoLog.Api.Data;
using GeoLog.Api.Data.Entities;
using GeoLog.Api.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/users")]


    public class UsersController : ControllerBase
    {
        private readonly GeoLogDbContext _context;
        private readonly IMapper _mapper;

    public UsersController(GeoLogDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterUserDto registerDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var usernameLower = registerDto.Username.ToLower();
        var emailLower = registerDto.Email.ToLower();
        // Sprawdzamy oba warunki w jednym zapytaniu do bazy - to jest bardziej wydajne!
        var userExists = await _context.Users
            .AnyAsync(u => u.Username == usernameLower || u.Email == emailLower);

        if (userExists)
        {
            // Możemy nawet sprawdzić, które pole jest zduplikowane,
            // aby dać użytkownikowi lepszą informację zwrotną.
            if (await _context.Users.AnyAsync(u => u.Username == usernameLower))
            {
                return Conflict(new { message = "Podana nazwa użytkownika jest już zajęta." });
            }
            if (await _context.Users.AnyAsync(u => u.Email == emailLower))
            {
                return Conflict(new { message = "Użytkownik o podanym adresie email już istnieje." });
            }
        }

        var newUser = new User
        {
            // Id, CreatedAt, UpdatedAt są generowane automatycznie
            Email = emailLower,
            Username = usernameLower,
            HashedPassword = BCrypt.Net.BCrypt.HashPassword(registerDto.Password)
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
