using AutoMapper;
using GeoLog.Api.Data.Entities;
using GeoLog.Api.DTOs;

namespace GeoLog.Api.Mappers
{
    public class RouteProfile : Profile
    {
        public RouteProfile()
        {
            // KLUCZOWE: mapuj RouteStat -> Stats
            CreateMap<GeoRoute, RouteDto>()
                .ForMember(d => d.Stats, opt => opt.MapFrom(s => s.RouteStat));

            CreateMap<RouteStat, RouteStatDto>();

            CreateMap<RoutePoint, RoutePointDto>()
                .ForMember(dest => dest.Latitude, opt => opt.MapFrom(src => src.Location.Coordinate.Y))
                .ForMember(dest => dest.Longitude, opt => opt.MapFrom(src => src.Location.Coordinate.X))
                .ForMember(dest => dest.Elevation, opt => opt.MapFrom(src => src.Location.Coordinate.Z));
        }
    }
}